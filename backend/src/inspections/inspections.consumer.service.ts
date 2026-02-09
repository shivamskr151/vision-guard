import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class InspectionsConsumerService {
    private readonly logger = new Logger(InspectionsConsumerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly elasticsearchService: ElasticsearchService,
    ) { }

    async processInspectionUpdate(data: any) {
        this.logger.log(
            `Received inspection update: ID ${data.inspectionId} for ${data.assetId}`,
        );

        try {
            // Verify asset exists
            const asset = await this.prisma.asset.findUnique({
                where: { assetId: data.assetId },
            });

            if (!asset) {
                this.logger.warn(`Asset ${data.assetId} not found, skipping inspection update`);
                return;
            }

            // Create new inspection in PostgreSQL (always create for real-time updates)
            const inspection = await this.prisma.inspection.create({
                data: {
                    assetId: data.assetId,
                    inspectorId: data.inspectorId,
                    type: data.type,
                    status: data.status,
                    result: data.result,
                    scheduledDate: new Date(data.scheduledDate),
                    completedDate: data.completedDate ? new Date(data.completedDate) : null,
                    durationSeconds: data.durationSeconds,
                    defects: data.defects,
                    notes: data.notes,
                },
            });

            this.logger.log(`Created NEW inspection in DB: ID ${inspection.id}`);

            // Index to Elasticsearch
            await this.elasticsearchService.index({
                index: 'inspections',
                id: inspection.id.toString(),
                document: {
                    id: inspection.id,
                    assetId: inspection.assetId,
                    inspectorId: inspection.inspectorId,
                    status: inspection.status,
                    result: inspection.result,
                    scheduledDate: inspection.scheduledDate,
                    completedDate: inspection.completedDate,
                    durationSeconds: inspection.durationSeconds,
                    zone: asset.zone,
                    assetType: asset.type,
                    updatedAt: new Date(),
                },
            } as any);

            this.logger.log(`Indexed inspection in Elasticsearch: ID ${inspection.id}`);
        } catch (error) {
            this.logger.error('Error processing inspection update', error);
        }
    }
}
