import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';

import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TelemetryConsumerService {
    private readonly logger = new Logger(TelemetryConsumerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly elasticsearchService: ElasticsearchService,
        private readonly eventsGateway: EventsGateway,
    ) { }

    async saveTelemetry(data: any) {
        try {
            // Save to PostgreSQL
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

            // Index to Elasticsearch
            await this.elasticsearchService.index({
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
            });

            // Emit Real-time Update
            this.eventsGateway.broadcast('telemetry', savedRecord);

        } catch (error) {
            this.logger.error('Error processing telemetry data', error);
        }
    }
}
