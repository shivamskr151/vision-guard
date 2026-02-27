import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class AnomaliesService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(AnomaliesService.name);
    private anomalyAggregator: any;

    constructor(
        private readonly prisma: PrismaService,
        private readonly elasticsearchService: ElasticsearchService,
        private readonly eventsGateway: EventsGateway,
        private readonly configService: ConfigService
    ) { }

    async onModuleInit() {
        const nodeEnv = this.configService.get<string>('nodeEnv');

        await this.createIndex();

        // Initialize Aggregator for anomalies
        this.anomalyAggregator = {
            buffer: [],
            timer: null,
            maxSize: 20, // Smaller batch for critical alerts
            maxTimeMs: 1000, // Or every 1 second
            add: (item: any) => {
                this.anomalyAggregator.buffer.push(item);
                if (this.anomalyAggregator.buffer.length >= this.anomalyAggregator.maxSize) {
                    this.flushAnomalies();
                } else if (!this.anomalyAggregator.timer) {
                    this.anomalyAggregator.timer = setTimeout(() => this.flushAnomalies(), this.anomalyAggregator.maxTimeMs);
                }
            }
        };

        // Simulation stream is now handled by an external producer service.
    }

    async onModuleDestroy() {
        await this.flushAnomalies();
    }



    private async createIndex() {
        const indexExists = await this.elasticsearchService.indices.exists({ index: 'anomaly_events' });
        if (!indexExists) {
            await this.elasticsearchService.indices.create({
                index: 'anomaly_events',
                body: {
                    mappings: {
                        properties: {
                            id: { type: 'keyword' },
                            timestamp: { type: 'date' },
                            severity: { type: 'keyword' },
                            type: { type: 'keyword' },
                            assetId: { type: 'keyword' },
                            location: { type: 'keyword' },
                            confidence: { type: 'float' },
                            isResolved: { type: 'boolean' }
                        }
                    }
                }
            } as any);
            this.logger.log('Created anomaly_events index with mapping');
        }
    }

    private async flushAnomalies() {
        if (!this.anomalyAggregator || this.anomalyAggregator.buffer.length === 0) return;

        if (this.anomalyAggregator.timer) {
            clearTimeout(this.anomalyAggregator.timer);
            this.anomalyAggregator.timer = null;
        }

        const batch = [...this.anomalyAggregator.buffer];
        this.anomalyAggregator.buffer = [];

        this.logger.debug(`Aggregator: Flushing batch of ${batch.length} anomalies`);

        // Step 3: WebSocket (UI Update)
        batch.forEach(record => {
            this.eventsGateway.broadcast('anomaly', record);
        });

        // Step 4: Elasticsearch Index (Bulk)
        try {
            const operations = batch.flatMap(record => [
                { index: { _index: 'anomaly_events', _id: record.id } },
                {
                    id: record.id,
                    timestamp: record.timestamp,
                    severity: record.severity,
                    type: record.type,
                    description: record.description,
                    assetId: record.assetId,
                    location: record.location,
                    confidence: record.confidence,
                    isResolved: record.isResolved,
                }
            ]);

            this.elasticsearchService.bulk({
                refresh: false,
                operations
            }).catch(err => this.logger.error('Bulk Anomaly ES Indexing failed', err));
        } catch (error) {
            this.logger.error('Error in Bulk Anomaly ES Indexing', error);
        }
    }

    @EventPattern('anomaly_events')
    async processAnomalyData(@Payload() data: any) {
        this.logger.log('Received anomaly data:', data);

        try {
            // Step 1: DB Save (Source of Truth)
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

            // Step 2: Aggregator
            if (this.anomalyAggregator) {
                this.anomalyAggregator.add(savedData);
            } else {
                this.eventsGateway.broadcast('anomaly', savedData);
            }

        } catch (error) {
            this.logger.error('Error processing anomaly data', error);
        }
    }

    async getMapData() {
        const zones = await (this.prisma as any).zone.findMany();

        const result = await this.elasticsearchService.search({
            index: 'anomaly_events',
            size: 100,
        });
        const hits = result.hits.hits as any[];

        const regionMap: Record<string, string> = {};
        zones.forEach((z: any) => {
            regionMap[z.label] = z.zoneId;
        });

        const markers = hits.map((hit: any, index: number) => {
            const source = hit._source;
            const regionId = regionMap[source.location] || (zones[0]?.zoneId || 'unknown');

            return {
                id: `am-${source.id}`,
                regionId,
                x: 20 + (index * 10),
                y: 20 + (index * 5),
                type: source.severity === 'critical' ? 'hotspot' : 'camera',
                hotspotIcon: source.severity === 'critical' ? 'warning' : undefined,
            };
        });

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

    async getAllAssetIds() {
        const assets = await this.prisma.asset.findMany({
            select: { assetId: true }
        });
        return assets.map(a => a.assetId);
    }
}
