import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { KafkaProducerService } from '../kafka/producer/kafka.producer.service';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { EventsGateway } from '../events/events.gateway';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TelemetryService.name);
    private telemetryAggregator: any;

    constructor(
        private readonly kafkaProducerService: KafkaProducerService,
        private readonly prisma: PrismaService,
        private readonly elasticsearchService: ElasticsearchService,
        private readonly eventsGateway: EventsGateway,
        private readonly configService: ConfigService
    ) { }

    async onModuleInit() {
        const nodeEnv = this.configService.get<string>('nodeEnv');

        await this.createIndex();

        // Initialize Aggregator for high-frequency telemetry
        this.telemetryAggregator = {
            buffer: [],
            timer: null,
            maxSize: 50, // Flush every 50 records
            maxTimeMs: 1000, // Or every 1 second
            add: (item: any) => {
                this.telemetryAggregator.buffer.push(item);
                if (this.telemetryAggregator.buffer.length >= this.telemetryAggregator.maxSize) {
                    this.flushTelemetry();
                } else if (!this.telemetryAggregator.timer) {
                    this.telemetryAggregator.timer = setTimeout(() => this.flushTelemetry(), this.telemetryAggregator.maxTimeMs);
                }
            }
        };

        if (nodeEnv !== 'production') {
            this.startTelemetryStream();
        } else {
            this.logger.log('Production mode: Simulation stream disabled.');
        }
    }

    async onModuleDestroy() {
        await this.flushTelemetry();
    }

    private startTelemetryStream() {
        this.logger.log('Starting Asset Telemetry Stream from CSV...');
        const dataDir = this.configService.get<string>('simulation.dataDir')!;
        const fileName = this.configService.get<string>('simulation.files.telemetry')!;
        const csvPath = path.join(process.cwd(), dataDir, fileName);
        const intervalMs = this.configService.get<number>('simulation.intervals.telemetry')!;

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

                const criticalThreshold = this.configService.get<number>('simulation.thresholds.criticalAnomalies')!;
                const warningThreshold = this.configService.get<number>('simulation.thresholds.warningAnomalies')!;

                const status = activeAnomalies > criticalThreshold ? 'critical' : (activeAnomalies > warningThreshold ? 'warning' : 'normal');

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

    private async createIndex() {
        const indexExists = await this.elasticsearchService.indices.exists({ index: 'asset_telemetry' });
        if (!indexExists) {
            await this.elasticsearchService.indices.create({
                index: 'asset_telemetry',
                body: {
                    mappings: {
                        properties: {
                            id: { type: 'keyword' },
                            timestamp: { type: 'date' },
                            assetId: { type: 'keyword' },
                            assetInspection: { type: 'integer' },
                            assetOverdue: { type: 'integer' },
                            activeAnomalies: { type: 'integer' },
                            inspectionCompliance: { type: 'float' },
                            criticalAssetRiskIndex: { type: 'float' },
                            status: { type: 'keyword' }
                        }
                    }
                }
            } as any);
            this.logger.log('Created asset_telemetry index with mapping');
        }
    }

    private async flushTelemetry() {
        if (!this.telemetryAggregator || this.telemetryAggregator.buffer.length === 0) return;

        if (this.telemetryAggregator.timer) {
            clearTimeout(this.telemetryAggregator.timer);
            this.telemetryAggregator.timer = null;
        }

        const batch = [...this.telemetryAggregator.buffer];
        this.telemetryAggregator.buffer = [];

        this.logger.debug(`Aggregator: Flushing batch of ${batch.length} telemetry records`);

        // Step 3: WebSocket (UI Update)
        batch.forEach(record => {
            this.eventsGateway.broadcast('telemetry', record);
        });

        // Step 4: Elasticsearch Index (Bulk)
        try {
            const operations = batch.flatMap(record => [
                { index: { _index: 'asset_telemetry', _id: record.id } },
                {
                    id: record.id,
                    timestamp: record.timestamp,
                    assetId: record.assetId,
                    assetInspection: record.assetInspection,
                    assetOverdue: record.assetOverdue,
                    activeAnomalies: record.activeAnomalies,
                    inspectionCompliance: record.inspectionCompliance,
                    criticalAssetRiskIndex: record.criticalAssetRiskIndex,
                    status: record.status
                }
            ]);

            this.elasticsearchService.bulk({
                refresh: false,
                operations
            }).catch(err => this.logger.error('Bulk Telemetry ES Indexing failed', err));
        } catch (error) {
            this.logger.error('Error in Bulk Telemetry ES Indexing', error);
        }
    }

    async saveTelemetry(data: any) {
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

            // Step 2: Aggregator (For Batching downstream operations)
            if (this.telemetryAggregator) {
                this.telemetryAggregator.add(savedRecord);
            } else {
                // Fallback if aggregator not init
                this.eventsGateway.broadcast('telemetry', savedRecord);
            }

        } catch (error) {
            this.logger.error('Error processing telemetry data', error);
        }
    }
}
