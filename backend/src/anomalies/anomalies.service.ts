import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class AnomaliesService {
    private readonly logger = new Logger(AnomaliesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly elasticsearchService: ElasticsearchService,
    ) { }

    @EventPattern('anomaly_events')
    async processAnomalyData(@Payload() data: any) {
        this.logger.log('Received anomaly data:', data);

        try {
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

        } catch (error) {
            this.logger.error('Error processing anomaly data', error);
        }
    }
}
