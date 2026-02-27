import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearchService: ElasticsearchService
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  async purgeData() {
    this.logger.warn('Initiating full data purge for MongoDB and Elasticsearch...');

    try {
      // 1. Delete MongoDB Data
      await this.prisma.$transaction([
        this.prisma.assetTelemetry.deleteMany(),
        this.prisma.anomalyEvent.deleteMany(),
        this.prisma.inspection.deleteMany(),
        this.prisma.inspectionChecklist.deleteMany(),
        this.prisma.inspectionTemplate.deleteMany(),
        this.prisma.customField.deleteMany(),
        this.prisma.schemaLibrary.deleteMany(),
        this.prisma.asset.deleteMany(),
        (this.prisma as any).zone.deleteMany()
      ]);
      this.logger.log('Successfully deleted all MongoDB records.');
    } catch (err) {
      this.logger.error('Error deleting MongoDB records', err);
    }

    try {
      // 2. Delete Elasticsearch Indices
      const indices = ['assets', 'asset_telemetry', 'anomaly_events', 'inspections'];
      for (const index of indices) {
        const exists = await this.elasticsearchService.indices.exists({ index });
        if (exists) {
          await this.elasticsearchService.indices.delete({ index });
          this.logger.log(`Deleted Elasticsearch index: ${index}`);
        }
      }
    } catch (err) {
      this.logger.error('Error deleting Elasticsearch indices', err);
    }

    return { message: 'Data purge completed.' };
  }
}
