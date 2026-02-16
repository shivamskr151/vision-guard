import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { KafkaProducerService } from '../kafka/producer/kafka.producer.service';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { EventsGateway } from '../events/events.gateway';
import { Payload } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelemetryService implements OnModuleInit {
    private readonly logger = new Logger(TelemetryService.name);

    constructor(
        private readonly kafkaProducerService: KafkaProducerService,
        private readonly prisma: PrismaService,
        private readonly elasticsearchService: ElasticsearchService,
        private readonly eventsGateway: EventsGateway,
        private readonly configService: ConfigService
    ) { }

    async onModuleInit() {
        const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
        if (!isProduction) {
            this.startTelemetryStream();
        } else {
            this.logger.log('Production mode: Simulation stream disabled.');
        }
    }

    private startTelemetryStream() {
        this.logger.log('Starting Asset Telemetry Stream from CSV...');
        const dataDir: string = this.configService.get<string>('DATA_DIR') || 'Data';
        const fileName: string = this.configService.get<string>('TELEMETRY_DATA_FILE') || 'telemetry_data.csv';
        const csvPath = path.join(process.cwd(), dataDir, fileName);
        const intervalMs = parseInt(this.configService.get<string>('TELEMETRY_STREAM_INTERVAL') || '2000');

        setInterval(async () => {
            try {
                if (!fs.existsSync(csvPath)) {
                    this.logger.warn(`CSV file not found at ${csvPath}`);
                    return;
                }

                const fileContent = fs.readFileSync(csvPath, 'utf-8');
                const lines = fileContent.split('\n').filter(line => line.trim() !== '');

                // Skip header, pick random line or iterate
                const randomLine = lines[Math.floor(Math.random() * (lines.length - 1)) + 1];
                const values = randomLine.split(',');

                const assetId = values[0];
                const assetInspection = parseInt(values[1]);
                const assetOverdue = parseInt(values[2]);
                const activeAnomalies = parseInt(values[3]);
                const inspectionCompliance = parseFloat(values[4]);
                const criticalAssetRiskIndex = parseFloat(values[5]);

                const status = activeAnomalies > 150 ? 'critical' : (activeAnomalies > 100 ? 'warning' : 'normal');

                const payload = {
                    timestamp: new Date().toISOString(),
                    assetId,
                    assetInspection,
                    assetOverdue,
                    activeAnomalies,
                    inspectionCompliance,
                    criticalAssetRiskIndex,
                    status
                };

                this.kafkaProducerService.emit('asset_telemetry', payload);
                this.logger.verbose(`Emitted CSV telemetry for ${assetId}`);

            } catch (error) {
                this.logger.error('Error in telemetry stream', error);
            }
        }, intervalMs);
    }

    async saveTelemetry(data: any) {
        try {
            // Step 1: DB Save (Source of Truth)
            // Check if asset exists, if not create placeholder
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

            const savedRecord = await this.prisma.assetTelemetry.create({
                data: {
                    timestamp: new Date(data.timestamp),
                    assetId: data.assetId,
                    assetInspection: data.assetInspection,
                    assetOverdue: data.assetOverdue,
                    activeAnomalies: data.activeAnomalies,
                    inspectionCompliance: data.inspectionCompliance,
                    criticalAssetRiskIndex: data.criticalAssetRiskIndex,
                    status: data.status,
                },
            });
            this.logger.log(`Saved Telemetry to DB: ${savedRecord.id}`);

            // Step 3: WebSocket (UI Update) - Before ES to ensure immediate reactivity
            this.eventsGateway.broadcast('telemetry', savedRecord);

            // Step 4: Elasticsearch Index (Async) - Do not await
            this.elasticsearchService.index({
                index: 'asset_telemetry',
                document: {
                    id: savedRecord.id,
                    timestamp: savedRecord.timestamp,
                    assetId: savedRecord.assetId,
                    status: savedRecord.status,
                    assetInspection: savedRecord.assetInspection,
                    assetOverdue: savedRecord.assetOverdue,
                    activeAnomalies: savedRecord.activeAnomalies,
                    inspectionCompliance: savedRecord.inspectionCompliance,
                    criticalAssetRiskIndex: savedRecord.criticalAssetRiskIndex,
                },
            }).catch(err => this.logger.error('Async ES Indexing failed', err));

        } catch (error) {
            this.logger.error('Error processing telemetry data', error);
        }
    }

}
