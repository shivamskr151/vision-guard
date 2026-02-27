import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import * as fs from 'fs';
import * as path from 'path';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventsGateway } from '../events/events.gateway';
import { ConfigService } from '@nestjs/config';
import { paginate } from '../common/utils/pagination.util';

@Injectable()
export class InspectionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InspectionsService.name);
  private inspectionCounter = 10000;
  private inspectionAggregator: any;

  constructor(
    private prisma: PrismaService,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly eventsGateway: EventsGateway,
    private readonly configService: ConfigService
  ) { }

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('nodeEnv');

    // Initialize Aggregator for inspections
    this.inspectionAggregator = {
      buffer: [],
      timer: null,
      maxSize: 10, // Small batch
      maxTimeMs: 2000, // Or every 2 seconds
      add: (item: any, asset: any) => {
        this.inspectionAggregator.buffer.push({ item, asset });
        if (this.inspectionAggregator.buffer.length >= this.inspectionAggregator.maxSize) {
          this.flushInspections();
        } else if (!this.inspectionAggregator.timer) {
          this.inspectionAggregator.timer = setTimeout(() => this.flushInspections(), this.inspectionAggregator.maxTimeMs);
        }
      }
    };

    await this.createIndex();

    // Simulation stream is now handled by an external producer service.
  }

  async onModuleDestroy() {
    await this.flushInspections();
  }



  async createIndex() {
    const indexExists = await this.elasticsearchService.indices.exists({ index: 'inspections' });
    if (!indexExists) {
      await this.elasticsearchService.indices.create({
        index: 'inspections',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              assetId: { type: 'keyword' },
              status: { type: 'keyword' },
              result: { type: 'keyword' },
              scheduledDate: { type: 'date' },
              completedDate: { type: 'date' },
              durationSeconds: { type: 'integer' },
              zone: { type: 'keyword' },
              type: { type: 'keyword' }
            },
          },
        },
      } as any);
    }
  }

  async indexInspection(inspection: any, asset: any) {
    return this.elasticsearchService.index({
      index: 'inspections',
      id: inspection.id.toString(),
      body: {
        id: inspection.id,
        assetId: inspection.assetId,
        status: inspection.status,
        result: inspection.result,
        scheduledDate: inspection.scheduledDate,
        completedDate: inspection.completedDate,
        durationSeconds: inspection.durationSeconds,
        zone: asset?.zone,
        type: asset?.type,
      }
    } as any);
  }

  private async flushInspections() {
    if (!this.inspectionAggregator || this.inspectionAggregator.buffer.length === 0) return;

    if (this.inspectionAggregator.timer) {
      clearTimeout(this.inspectionAggregator.timer);
      this.inspectionAggregator.timer = null;
    }

    const batch = [...this.inspectionAggregator.buffer];
    this.inspectionAggregator.buffer = [];

    this.logger.debug(`Aggregator: Flushing batch of ${batch.length} inspections`);

    try {
      // Step 4: Bulk Elasticsearch Index
      const operations = batch.flatMap(({ item, asset }) => [
        { index: { _index: 'inspections', _id: item.id.toString() } },
        {
          id: item.id,
          assetId: item.assetId,
          inspectorId: item.inspectorId,
          status: item.status,
          result: item.result,
          scheduledDate: item.scheduledDate,
          completedDate: item.completedDate,
          durationSeconds: item.durationSeconds,
          zone: asset?.zone,
          type: asset?.type,
          updatedAt: new Date(),
        }
      ]);

      await this.elasticsearchService.bulk({
        refresh: true, // Refresh so stats are accurate
        operations
      } as any);

      this.logger.log(`Bulk Indexed ${batch.length} inspections in ES`);

      // Broadcast global stats update after ES is updated
      const stats = await this.getRealtimeGraphsData();
      this.eventsGateway.broadcast('inspection_stats', stats);

    } catch (error) {
      this.logger.error('Error in Bulk Inspection Flush', error);
    }
  }

  @EventPattern('inspection_updates')
  async processInspectionUpdate(@Payload() data: any) {
    this.logger.log(
      `Received inspection update: ID ${data.inspectionId} for ${data.assetId}`,
    );

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

      // Step 3: WebSocket (UI Update) - Broadcast the specific update immediately
      this.eventsGateway.broadcast('inspection_update', inspection);

      // Step 2: Aggregator (For Batching Downstream ES indexing and Stats recalculation)
      if (this.inspectionAggregator) {
        this.inspectionAggregator.add(inspection, asset);
      } else {
        // Fallback
        await this.indexInspection(inspection, asset);
        const stats = await this.getRealtimeGraphsData();
        this.eventsGateway.broadcast('inspection_stats', stats);
      }

    } catch (error) {
      this.logger.error('Error processing inspection update', error);
    }
  }

  async getDashboardData(range: string = 'week') {
    const now = new Date();
    let startDate = new Date();

    if (range === 'live') {
      startDate.setHours(now.getHours() - 1);
    } else if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setDate(now.getDate() - 7);
    }

    const dueCount = await this.prisma.inspection.count({
      where: {
        status: 'scheduled',
        scheduledDate: {
          lte: new Date(new Date().setDate(new Date().getDate() + 7))
        }
      }
    });

    const overdueCount = await this.prisma.inspection.count({ where: { status: 'overdue' } });

    const completedInRange = await this.prisma.inspection.count({
      where: {
        status: 'completed',
        completedDate: { gte: startDate }
      }
    });

    const totalInRange = await this.prisma.inspection.count({
      where: {
        scheduledDate: { gte: startDate, lte: now }
      }
    });

    const avgDurationAgg = await this.prisma.inspection.aggregate({
      _avg: { durationSeconds: true },
      where: {
        status: 'completed',
        completedDate: { gte: startDate }
      }
    });
    const avgDuration = Math.round(avgDurationAgg._avg.durationSeconds || 0);

    const assets = await this.prisma.asset.findMany({
      include: {
        inspections: {
          orderBy: { scheduledDate: 'desc' },
          take: 1
        },
        telemetry: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    const activeAnomaliesByAsset = await this.prisma.anomalyEvent.groupBy({
      by: ['assetId'],
      where: { isResolved: false },
      _count: true
    });

    const anomalyAssetMap = new Map(activeAnomaliesByAsset.map(a => [a.assetId, a._count]));

    const mapData = assets.map(asset => {
      const latestTelemetry = asset.telemetry[0];
      const latestInspection = asset.inspections[0];

      let isInspectionDue = false;
      if (latestTelemetry && latestTelemetry.assetInspection !== null) {
        isInspectionDue = latestTelemetry.assetInspection > 0;
      } else if (latestInspection) {
        const today = new Date();
        const dueDate = new Date(latestInspection.scheduledDate);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (latestInspection.status !== 'completed' && diffDays <= 7) {
          isInspectionDue = true;
        }
      }

      const healthStatus = latestTelemetry?.status || asset.healthStatus || 'good';

      return {
        id: asset.id,
        assetId: asset.assetId,
        x: asset.x,
        y: asset.y,
        healthStatus,
        inspectionDue: isInspectionDue,
        hasAnomaly: anomalyAssetMap.has(asset.assetId) || (latestTelemetry?.activeAnomalies && latestTelemetry.activeAnomalies > 0),
        hasCamera: (asset.linkedCameras || 0) > 0,
        type: asset.type,
        name: asset.name
      };
    });

    const dbZones = await (this.prisma as any).zone.findMany();
    const totalAssets = await this.prisma.asset.count();
    const activeAnomaliesCount = await this.prisma.anomalyEvent.count({
      where: { isResolved: false }
    });

    const rawRisk = (activeAnomaliesCount * 1.5) + (overdueCount * 2.5);
    const riskIndex = parseFloat(Math.min(100, rawRisk).toFixed(1));

    const slaCompliance = totalInRange > 0 ? ((completedInRange / totalInRange) * 100).toFixed(1) : '0.0';

    const graphData = await this.getRealtimeGraphsData(range);

    return {
      kpi: {
        totalAssets,
        due: dueCount,
        overdue: overdueCount,
        activeAnomalies: activeAnomaliesCount,
        completed: completedInRange,
        sla: slaCompliance,
        riskIndex,
        averageDuration: avgDuration
      },
      ...graphData,
      mapData: mapData,
      mapZones: dbZones.map(z => ({
        id: z.zoneId,
        label: z.label,
        x: z.x,
        y: z.y,
        width: z.width,
        height: z.height
      }))
    };
  }

  async getUpcoming(page: number = 1, limit: number = 10) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const where = {
      status: 'scheduled',
      scheduledDate: {
        gte: today,
        lte: nextWeek
      }
    };

    return paginate(
      this.prisma.inspection,
      {
        where,
        include: { asset: true },
        orderBy: { scheduledDate: 'asc' }
      },
      { page, limit },
      (data: any[]) => data.map(i => {
        const daysDiff = Math.ceil((new Date(i.scheduledDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return {
          id: i.id,
          assetName: i.asset.name,
          type: i.asset.type,
          zone: i.asset.zone,
          dueDate: i.scheduledDate.toISOString().split('T')[0],
          daysUntilDue: daysDiff,
          status: i.status === 'overdue' ? 'overdue' : (daysDiff <= 2 ? 'urgent' : 'due')
        };
      })
    );
  }

  async getRealtimeGraphsData(range: string = 'week') {
    let gte = 'now-7d';
    let lte = 'now';
    let interval = 'day';
    let isFixed = false;

    if (range === 'live') {
      gte = 'now-1h';
      interval = '5m';
      isFixed = true;
    } else if (range === 'today') {
      gte = 'now/d';
      interval = 'hour';
      isFixed = false;
    } else if (range === 'week') {
      gte = 'now-7d';
      interval = 'day';
      isFixed = false;
    }

    const dateHistogram: any = { field: 'scheduledDate' };
    if (isFixed) {
      dateHistogram.fixed_interval = interval;
    } else {
      dateHistogram.calendar_interval = interval;
    }

    const timelineRes = await this.elasticsearchService.search({
      index: 'inspections',
      body: {
        size: 0,
        query: { range: { scheduledDate: { gte, lte } } },
        aggs: {
          inspections_over_time: {
            date_histogram: dateHistogram
          }
        }
      }
    } as any);

    const timelineAggs = (timelineRes.aggregations as any)?.inspections_over_time?.buckets || [];
    const timelineData = timelineAggs.map((b: any) => ({
      label: range === 'week'
        ? new Date(b.key_as_string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : new Date(b.key_as_string).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      count: b.doc_count
    }));

    const zoneCoverageRes = await this.elasticsearchService.search({
      index: 'inspections',
      body: {
        size: 0,
        query: { range: { scheduledDate: { gte, lte } } },
        aggs: {
          zones: {
            terms: { field: 'zone', size: 20 },
            aggs: {
              completed: { filter: { term: { 'status': 'completed' } } }
            }
          }
        }
      }
    } as any);

    const zoneAggs = (zoneCoverageRes.aggregations as any)?.zones?.buckets || [];
    const zoneCoverageData = zoneAggs.map((b: any) => ({
      zone: b.key || 'Unknown',
      percentage: Math.round((b.completed.doc_count / (b.doc_count || 1)) * 100)
    }));

    const trendConfig: any = { gte: 'now-6M/M', lte: 'now/M', interval: 'month' };
    if (range === 'live' || range === 'today') {
      trendConfig.gte = 'now-24h';
      trendConfig.interval = 'hour';
    } else if (range === 'week') {
      trendConfig.gte = 'now-7d';
      trendConfig.interval = 'day';
    }

    const trendRes = await this.elasticsearchService.search({
      index: 'inspections',
      body: {
        size: 0,
        query: { range: { scheduledDate: { gte: trendConfig.gte, lte: trendConfig.lte } } },
        aggs: {
          months: {
            date_histogram: {
              field: 'scheduledDate',
              calendar_interval: trendConfig.interval,
              format: range === 'week' ? 'dd MMM' : (range === 'live' ? 'HH:mm' : 'MMM')
            },
            aggs: {
              completed: { filter: { term: { status: 'completed' } } }
            }
          }
        }
      }
    } as any);

    const trendAggs = (trendRes.aggregations as any)?.months?.buckets || [];
    const complianceTrendData = trendAggs.map((b: any) => ({
      month: b.key_as_string,
      value: Math.round((b.completed.doc_count / (b.doc_count || 1)) * 100)
    }));

    const typeDistRes = await this.elasticsearchService.search({
      index: 'inspections',
      body: {
        size: 0,
        query: { range: { scheduledDate: { gte, lte } } },
        aggs: {
          types: { terms: { field: 'type', size: 10 } }
        }
      }
    } as any);

    const typeAggs = (typeDistRes.aggregations as any)?.types?.buckets || [];
    const typeData = typeAggs.map((b: any) => ({
      type: b.key,
      value: b.doc_count,
      percentage: 0
    }));

    const totalTypes = typeData.reduce((sum: number, item: any) => sum + item.value, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    typeData.forEach((item: any, index: number) => {
      item.percentage = totalTypes > 0 ? Math.round((item.value / totalTypes) * 100) : 0;
      item.color = colors[index % colors.length];
    });

    return {
      timeline: timelineData,
      zoneCoverage: zoneCoverageData,
      complianceTrend: complianceTrendData,
      typeDistribution: typeData
    };
  }

  async getReports(page: number = 1, limit: number = 10, status?: string) {
    const where: any = { status: { in: ['completed', 'overdue', 'missed'] } };

    if (status && status !== 'all') {
      if (status === 'pass') {
        where.status = 'completed';
        where.result = 'pass';
      } else if (status === 'fail') {
        where.OR = [
          { status: 'completed', result: 'fail' },
          { status: 'overdue' },
          { status: 'missed' }
        ];
        delete where.status;
      } else if (status === 'partial') {
        where.status = 'completed';
        where.result = { notIn: ['pass', 'fail'] };
      }
    }

    return paginate(
      this.prisma.inspection,
      {
        where,
        include: { asset: true },
        orderBy: { completedDate: 'desc' }
      },
      { page, limit },
      (data: any[]) => data.map((i: any) => ({
        id: i.id,
        assetName: i.asset.name,
        inspectionDate: i.completedDate ? i.completedDate.toISOString().split('T')[0] : i.scheduledDate.toISOString().split('T')[0],
        inspectionType: 'Routine',
        status: i.status === 'completed'
          ? (i.result === 'pass' ? 'pass' : i.result === 'fail' ? 'fail' : 'partial')
          : 'fail',
        defects: i.result === 'fail' ? i.defects : 0,
        inspector: 'Vision System AI',
        duration: i.durationSeconds ? `${Math.floor(i.durationSeconds / 60)} min` : '-'
      }))
    );
  }


  async create(createInspectionDto: CreateInspectionDto) {
    const { assetId, scheduledDate, type, status } = createInspectionDto;
    const asset = await this.prisma.asset.findUnique({ where: { assetId } });
    if (!asset) {
      throw new Error(`Asset with logical ID ${assetId} not found`);
    }

    const newInspection = await this.prisma.inspection.create({
      data: {
        assetId: asset.assetId,
        scheduledDate: new Date(scheduledDate),
        status: status || 'scheduled',
        result: null
      }
    });

    await this.indexInspection(newInspection, asset);
    return newInspection;
  }

  async findAll() {
    return this.prisma.inspection.findMany({
      include: { asset: true },
      orderBy: { scheduledDate: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.inspection.findUnique({
      where: { id: id as any },
      include: { asset: true }
    });
  }

  async update(id: string, updateInspectionDto: UpdateInspectionDto) {
    const { assetId, ...data } = updateInspectionDto;
    const inspection = await this.prisma.inspection.update({
      where: { id: id as any },
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
      },
      include: { asset: true }
    });

    await this.indexInspection(inspection, (inspection as any).asset);
    return inspection;
  }

  async sync() {
    const inspections = await this.prisma.inspection.findMany({
      include: { asset: true }
    });

    for (const inspection of inspections) {
      await this.indexInspection(inspection, inspection.asset);
    }

    return { message: `Synced ${inspections.length} inspections` };
  }

  async remove(id: string) {
    const inspection = await this.prisma.inspection.findUnique({ where: { id } });
    if (inspection) {
      await this.elasticsearchService.delete({
        index: 'inspections',
        id: id
      });
    }
    return this.prisma.inspection.delete({ where: { id } });
  }
}
