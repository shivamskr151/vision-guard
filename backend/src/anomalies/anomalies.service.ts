import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { KafkaProducerService } from '../kafka/producer/kafka.producer.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class AnomaliesService implements OnModuleInit {
    private readonly logger = new Logger(AnomaliesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly elasticsearchService: ElasticsearchService,
        private readonly eventsGateway: EventsGateway,
        private readonly kafkaProducerService: KafkaProducerService,
        private readonly configService: ConfigService
    ) { }

    async onModuleInit() {
        this.startSimulation();
    }

    private startSimulation() {
        this.logger.log('Starting Anomaly Simulation from CSV...');
        const dataDir: string = this.configService.get<string>('DATA_DIR') || 'Data';
        const fileName: string = this.configService.get<string>('ANOMALY_DATA_FILE') || 'anomaly_data.csv';
        const csvPath = path.join(process.cwd(), dataDir, fileName);
        const intervalMs = parseInt(this.configService.get<string>('ANOMALY_STREAM_INTERVAL') || '10000');

        setInterval(async () => {
            try {
                if (!fs.existsSync(csvPath)) {
                    this.logger.warn(`CSV file not found at ${csvPath}`);
                    return;
                }

                const fileContent = fs.readFileSync(csvPath, 'utf-8');
                const lines = fileContent.split('\n').filter(line => line.trim() !== '');
                // Skip header, pick random
                const randomLine = lines[Math.floor(Math.random() * (lines.length - 1)) + 1];
                const values = randomLine.split(',');

                const assetId = values[0];
                const type = values[1];
                const severity = values[2];
                const description = values[3];
                const location = values[4];
                const confidence = values[5];

                const payload = {
                    timestamp: new Date().toISOString(),
                    severity,
                    type,
                    description,
                    assetId,
                    location,
                    confidence,
                    isResolved: 'false'
                };

                this.kafkaProducerService.emit('anomaly_events', payload);
                this.logger.log(`Emitted CSV anomaly_events: ${assetId} - ${type}`);

            } catch (error) {
                this.logger.error('Error in simulation loop', error);
            }
        }, intervalMs);
    }

    @EventPattern('anomaly_events')
    async processAnomalyData(@Payload() data: any) {
        this.logger.log('Received anomaly data:', data);

        try {
            // Check if asset exists
            let asset = await this.prisma.asset.findUnique({
                where: { assetId: data.assetId },
            });

            if (!asset) {
                this.logger.warn(`Asset ${data.assetId} not found, creating placeholder...`);
                asset = await this.prisma.asset.create({
                    data: {
                        assetId: data.assetId,
                        name: `Unknown Asset ${data.assetId}`,
                        type: 'Unknown',
                        zone: 'Unknown',
                        healthStatus: 'unknown',
                        criticality: 5,
                        criticalityMax: 10,
                        x: 0,
                        y: 0
                    }
                });
            }

            // Save to PostgreSQL
            const savedData = await this.prisma.anomalyEvent.create({
                data: {
                    timestamp: new Date(data.timestamp),
                    severity: data.severity,
                    type: data.type,
                    description: data.description,
                    assetId: data.assetId,
                    location: data.location,
                    confidence: parseFloat(data.confidence),
                    isResolved: data.isResolved === 'true',
                },
            });
            this.logger.log(`Saved Anomaly to DB with ID: ${savedData.id}`);

            // Save to Elasticsearch
            await this.elasticsearchService.index({
                index: 'anomaly_events',
                document: {
                    id: savedData.id,
                    timestamp: savedData.timestamp,
                    severity: savedData.severity,
                    type: savedData.type,
                    description: savedData.description,
                    assetId: savedData.assetId,
                    location: savedData.location,
                    confidence: savedData.confidence,
                    isResolved: savedData.isResolved,
                },
            });
            this.logger.log('Indexed Anomaly in Elasticsearch');

            // Emit Real-time Update
            this.eventsGateway.broadcast('anomaly', savedData);

        } catch (error) {
            this.logger.error('Error processing anomaly data', error);
        }
    }
    async getMapData() {
        // 1. Fetch Zones from DB
        const zones = await (this.prisma as any).zone.findMany();

        // 2. Fetch Anomalies from ES
        const result = await this.elasticsearchService.search({
            index: 'anomaly_events',
            size: 100,
        });
        const hits = result.hits.hits as any[];

        // 3. Create dynamic region map (Label -> ZoneId)
        const regionMap: Record<string, string> = {};
        zones.forEach((z: any) => {
            regionMap[z.label] = z.zoneId;
        });

        // 4. Map markers
        const markers = hits.map((hit: any, index: number) => {
            const source = hit._source;
            // Default to first zone if not found, or handle gracefully
            const regionId = regionMap[source.location] || (zones[0]?.zoneId || 'unknown');

            return {
                id: `am-${source.id}`,
                regionId,
                x: 20 + (index * 10), // scatter them
                y: 20 + (index * 5),
                type: source.severity === 'critical' ? 'hotspot' : 'camera',
                hotspotIcon: source.severity === 'critical' ? 'warning' : undefined,
            };
        });

        // 5. Format regions
        const regions = zones.map((z: any) => ({
            id: z.zoneId,
            label: z.label,
            x: z.x,
            y: z.y,
            width: z.width,
            height: z.height
        }));

        return { regions, markers };
    }
}
