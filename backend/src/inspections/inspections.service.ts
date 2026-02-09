import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';

@Injectable()
export class InspectionsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private readonly elasticsearchService: ElasticsearchService
  ) { }

  private readonly logger = new Logger(InspectionsService.name);

  async onModuleInit() {
    this.createIndex();
  }

  async createIndex() {
    const indexExists = await this.elasticsearchService.indices.exists({ index: 'inspections' });
    if (!indexExists) {
      await this.elasticsearchService.indices.create({
        index: 'inspections',
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
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

  async seed() {
    const count = await this.prisma.inspection.count();
    if (count > 0) return { message: 'Inspections already seeded' };

    const assets = await this.prisma.asset.findMany();
    if (assets.length === 0) return { message: 'No assets found to seed inspections' };

    const statuses = ['scheduled', 'in-progress', 'completed', 'overdue', 'missed'];
    const results = ['pass', 'fail', 'warning'];

    const inspections: any[] = [];

    // Past inspections
    for (let i = 0; i < 50; i++) {
      const asset = assets[Math.floor(Math.random() * assets.length)];
      const isCompleted = Math.random() > 0.3;
      const status = isCompleted ? 'completed' : (Math.random() > 0.5 ? 'overdue' : 'missed');
      const result = isCompleted ? results[Math.floor(Math.random() * results.length)] : null;
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() - Math.floor(Math.random() * 60)); // Past 60 days

      let completedDate: Date | null = null;
      let durationSeconds: number | null = null;

      if (isCompleted) {
        const date = new Date(scheduledDate);
        date.setDate(date.getDate() + Math.random() * 2);
        completedDate = date;
        durationSeconds = Math.floor(Math.random() * 3600) + 600;
      }

      inspections.push({
        assetId: asset.assetId,
        status,
        result,
        scheduledDate,
        completedDate,
        durationSeconds,
        checklistData: {} as any
      });
    }

    // Future/Upcoming inspections
    for (let i = 0; i < 20; i++) {
      const asset = assets[Math.floor(Math.random() * assets.length)];
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 30)); // Next 30 days

      inspections.push({
        assetId: asset.assetId,
        status: 'scheduled',
        result: null,
        scheduledDate,
        completedDate: null,
        durationSeconds: null,
        checklistData: {} as any
      });
    }

    for (const data of inspections) {
      const inspection = await this.prisma.inspection.create({ data });
      // Fetch asset details for ES content
      const asset = assets.find(a => a.assetId === data.assetId);
      await this.indexInspection(inspection, asset);
    }

    return { message: `Seeded ${inspections.length} inspections` };
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

  async getDashboardData() {
    const dueCount = await this.prisma.inspection.count({
      where: {
        status: 'scheduled',
        scheduledDate: {
          lte: new Date(new Date().setDate(new Date().getDate() + 7))
        }
      }
    });

    const overdueCount = await this.prisma.inspection.count({ where: { status: 'overdue' } });

    // This month compliance
    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const completedLast30 = await this.prisma.inspection.count({
      where: {
        status: 'completed',
        completedDate: { gte: startOfMonth }
      }
    });

    const totalLast30 = await this.prisma.inspection.count({
      where: {
        scheduledDate: { gte: startOfMonth, lte: new Date() }
      }
    });



    // Timeline: Inspections scheduled per day for next 30 days (ES)
    const timeline = await this.elasticsearchService.search({
      index: 'inspections',
      body: {
        size: 0,
        query: {
          range: {
            scheduledDate: {
              gte: 'now-30d',
              lte: 'now+30d'
            }
          }
        },
        aggs: {
          inspections_over_time: {
            date_histogram: {
              field: 'scheduledDate',
              calendar_interval: 'day'
            }
          }
        }
      }
    } as any);

    const timelineAggs = timeline.aggregations as any;
    const timelineData = timelineAggs?.inspections_over_time?.buckets.map((b: any) => ({
      label: new Date(b.key_as_string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: b.doc_count
    })) || [];

    // Asset Type Distribution (ES)
    const typeDist = await this.elasticsearchService.search({
      index: 'inspections',
      body: {
        size: 0,
        aggs: {
          types: {
            terms: { field: 'type' }
          }
        }
      }
    } as any);

    const typeAggs = typeDist.aggregations as any;
    const typeData = typeAggs?.types?.buckets.map((b: any) => ({
      type: b.key,
      value: b.doc_count,
      percentage: 0
    })) || [];

    const totalTypes = typeData.reduce((sum: number, item: any) => sum + item.value, 0);
    typeData.forEach((item: any) => item.percentage = totalTypes > 0 ? Math.round((item.value / totalTypes) * 100) : 0);
    // Add colors 
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    typeData.forEach((item: any, index: number) => item.color = colors[index % colors.length]);

    // Fetch all inspections for aggregation
    const allInspections = await this.prisma.inspection.findMany({
      include: { asset: true }
    });

    // 1. Zone Coverage Calculation (DB)
    const zoneMap = new Map<string, { total: number, completed: number }>();
    allInspections.forEach(insp => {
      const zone = insp.asset?.zone || 'Unknown';
      if (!zoneMap.has(zone)) zoneMap.set(zone, { total: 0, completed: 0 });
      const stats = zoneMap.get(zone)!;
      stats.total++;
      if (insp.status === 'completed') stats.completed++;
    });

    const zoneData = Array.from(zoneMap.entries()).map(([zone, stats]) => ({
      zone,
      percentage: Math.round((stats.completed / (stats.total || 1)) * 100)
    }));

    // 2. Compliance Trend Calculation (Last 6 Months) (DB)
    const trendMap = new Map<string, { total: number, completed: number, order: number }>();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    allInspections.forEach(insp => {
      const date = new Date(insp.scheduledDate);
      const monthIndex = date.getMonth();
      const monthName = months[monthIndex];

      if (!trendMap.has(monthName)) trendMap.set(monthName, { total: 0, completed: 0, order: monthIndex });
      const stats = trendMap.get(monthName)!;
      stats.total++;
      if (insp.status === 'completed') stats.completed++;
    });

    const complianceTrend = Array.from(trendMap.values())
      .sort((a, b) => a.order - b.order)
      .map(stats => ({
        month: months[stats.order],
        value: Math.round((stats.completed / (stats.total || 1)) * 100)
      }));

    // Average Duration
    const avgDurationAgg = await this.prisma.inspection.aggregate({
      _avg: { durationSeconds: true },
      where: { status: 'completed' }
    });
    const avgDuration = Math.round(avgDurationAgg._avg.durationSeconds || 0);

    // Map Data: Fetch all assets and determine all statuses for the multi-layered map
    const assets = await this.prisma.asset.findMany({
      include: {
        inspections: {
          orderBy: { scheduledDate: 'desc' },
          take: 1
        },
      }
    });

    const activeAnomaliesByAsset = await this.prisma.anomalyEvent.groupBy({
      by: ['assetId'],
      where: { isResolved: false },
      _count: true
    });

    const anomalyAssetMap = new Map(activeAnomaliesByAsset.map(a => [a.assetId, a._count]));

    const mapData = assets.map(asset => {
      let isInspectionDue = false;
      const latestInspection = asset.inspections[0];

      if (latestInspection) {
        const today = new Date();
        const dueDate = new Date(latestInspection.scheduledDate);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        if (latestInspection.status !== 'completed' && diffDays <= 7) {
          isInspectionDue = true;
        }
      }

      return {
        id: asset.id,
        assetId: asset.assetId,
        x: asset.x,
        y: asset.y,
        healthStatus: asset.healthStatus, // 'good', 'warning', 'critical'
        inspectionDue: isInspectionDue,
        hasAnomaly: anomalyAssetMap.has(asset.assetId),
        hasCamera: (asset.linkedCameras || 0) > 0,
        type: asset.type,
        name: asset.name
      };
    });

    // Fetch zones from DB
    const dbZones = await (this.prisma as any).zone.findMany();

    // Total Assets
    const totalAssets = await this.prisma.asset.count();

    // Active Anomalies (unresolved)
    const activeAnomaliesCount = await this.prisma.anomalyEvent.count({
      where: { isResolved: false }
    });

    // Calculate Risk Index (Weighted average of anomalies and overdue inspections)
    const rawRisk = (activeAnomaliesCount * 1.5) + (overdueCount * 2.5);
    const riskIndex = parseFloat(Math.min(100, rawRisk).toFixed(1));

    // Recent Compliance (SLA) - Last 30 days
    const slaCompliance = totalLast30 > 0 ? ((completedLast30 / totalLast30) * 100).toFixed(1) : '100.0';

    return {
      kpi: {
        totalAssets,
        due: dueCount,
        overdue: overdueCount,
        activeAnomalies: activeAnomaliesCount,
        completed: completedLast30,
        sla: slaCompliance,
        riskIndex,
        averageDuration: avgDuration
      },
      timeline: timelineData,
      zoneCoverage: zoneData,
      typeDistribution: typeData,
      complianceTrend: complianceTrend,
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

  async getUpcoming() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7); // 7 days from today

    const upcoming = await this.prisma.inspection.findMany({
      where: {
        status: 'scheduled',
        scheduledDate: {
          gte: today,
          lte: nextWeek
        }
      },
      include: {
        asset: true
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });

    return upcoming.map(i => {
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
    });
  }

  async getReports() {
    const reports = await this.prisma.inspection.findMany({
      where: {
        status: { in: ['completed', 'overdue', 'missed'] } // Only historical/finalized statuses
      },
      include: {
        asset: true
      },
      orderBy: {
        completedDate: 'desc'
      }
    });

    return reports.map((i: any) => ({
      id: i.id,
      assetName: i.asset.name,
      inspectionDate: i.completedDate ? i.completedDate.toISOString().split('T')[0] : i.scheduledDate.toISOString().split('T')[0],
      inspectionType: 'Routine', // Placeholder or derive from asset type/template
      status: i.status === 'completed'
        ? (i.result === 'pass' ? 'pass' : i.result === 'fail' ? 'fail' : 'partial')
        : 'fail', // Map overdue/missed to fail for reports view or keep status? The UI expects pass/fail/partial. Let's map overdue to fail.
      defects: i.result === 'fail' ? i.defects : 0,
      inspector: 'Vision System AI',
      duration: i.durationSeconds ? `${Math.floor(i.durationSeconds / 60)} min` : '-'
    }));
  }

  async create(createInspectionDto: CreateInspectionDto) {
    const { assetId, scheduledDate, type, status } = createInspectionDto;

    // Validate asset exists
    const asset = await this.prisma.asset.findUnique({ where: { id: +assetId } }); // CreateInspectionDto assetId might come as string or number depending on validation
    if (!asset) {
      throw new Error(`Asset with ID ${assetId} not found`);
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

  findAll() {
    return `This action returns all inspections`;
  }

  findOne(id: number) {
    return `This action returns a #${id} inspection`;
  }

  async update(id: number, updateInspectionDto: UpdateInspectionDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { assetId, ...data } = updateInspectionDto;

    const inspection = await this.prisma.inspection.update({
      where: { id },
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

    console.log(`Syncing ${inspections.length} inspections to Elasticsearch...`);

    for (const inspection of inspections) {
      await this.indexInspection(inspection, inspection.asset);
    }

    return { message: `Synced ${inspections.length} inspections` };
  }

  remove(id: number) {
    return `This action removes a #${id} inspection`;
  }
}
