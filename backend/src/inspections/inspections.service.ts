import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import * as fs from 'fs';
import * as path from 'path';
import { KafkaProducerService } from '../kafka/producer/kafka.producer.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class InspectionsService implements OnModuleInit {
  private readonly logger = new Logger(InspectionsService.name);
  private inspectionCounter = 10000;

  constructor(
    private prisma: PrismaService,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly eventsGateway: EventsGateway,
  ) { }

  async onModuleInit() {
    this.createIndex();
    this.startInspectionStream();
  }

  private startInspectionStream() {
    this.logger.log('Starting Inspection Stream from CSV...');
    const csvPath = path.join(process.cwd(), 'Data', 'inspection_updates.csv');

    setInterval(async () => {
      try {
        if (!fs.existsSync(csvPath)) {
          this.logger.warn(`CSV file not found at ${csvPath}`);
          return;
        }

        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = fileContent.split('\n').filter((line) => line.trim() !== '');

        // Skip header, pick random line to simulate continuous updates
        const randomLine = lines[Math.floor(Math.random() * (lines.length - 1)) + 1];
        const values = randomLine.split(',');

        // Generate unique inspection ID for real-time creation
        const uniqueInspectionId = this.inspectionCounter++;

        const payload = {
          timestamp: new Date().toISOString(),
          inspectionId: uniqueInspectionId, // Use unique ID instead of CSV ID
          assetId: values[1],
          inspectorId: values[2],
          type: values[3],
          status: values[4],
          result: values[5] === 'null' ? null : values[5],
          scheduledDate: values[6],
          completedDate: values[7] === 'null' ? null : values[7],
          durationSeconds: values[8] === 'null' ? null : parseInt(values[8]),
          defects: parseInt(values[9]),
          notes: values[10],
        };

        this.kafkaProducerService.emit('inspection_updates', payload);
        this.logger.verbose(`Emitted NEW inspection for ${payload.assetId} (ID: ${payload.inspectionId})`);
      } catch (error) {
        this.logger.error('Error in inspection stream', error);
      }
    }, 8000); // Every 8 seconds
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

  @EventPattern('inspection_updates')
  async processInspectionUpdate(@Payload() data: any) {
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
          type: asset.type,
          updatedAt: new Date(),
        },
        refresh: true,
      } as any);

      this.logger.log(`Indexed inspection in Elasticsearch: ID ${inspection.id}`);

      // Fetch updated graph data from ES and broadcast
      const stats = await this.getRealtimeGraphsData();
      this.eventsGateway.broadcast('inspection_stats', stats);

    } catch (error) {
      this.logger.error('Error processing inspection update', error);
    }
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
        healthStatus, // 'good', 'warning', 'critical'
        inspectionDue: isInspectionDue,
        hasAnomaly: anomalyAssetMap.has(asset.assetId) || (latestTelemetry?.activeAnomalies && latestTelemetry.activeAnomalies > 0),
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

    // Fetch Graph Data from Elasticsearch (Centralized method)
    const graphData = await this.getRealtimeGraphsData();

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
      // Spread graph data (timeline, zoneCoverage, typeDistribution, complianceTrend)
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

  async getRealtimeGraphsData() {
    // 1. Timeline: Inspections scheduled per day for next 30 days
    const timelineRes = await this.elasticsearchService.search({
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

    const timelineAggs = (timelineRes.aggregations as any)?.inspections_over_time?.buckets || [];
    const timelineData = timelineAggs.map((b: any) => ({
      label: new Date(b.key_as_string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: b.doc_count
    }));

    // 2. Zone Coverage: % Completed / Total per Zone
    const zoneCoverageRes = await this.elasticsearchService.search({
      index: 'inspections',
      body: {
        size: 0,
        aggs: {
          zones: {
            terms: { field: 'zone', size: 20 },
            aggs: {
              completed: {
                filter: { term: { status: 'completed' } }
              }
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

    // 3. Compliance Trend: Monthly completion rate for last 6 months
    const trendRes = await this.elasticsearchService.search({
      index: 'inspections',
      body: {
        size: 0,
        query: {
          range: {
            scheduledDate: {
              gte: 'now-6M/M',
              lte: 'now/M'
            }
          }
        },
        aggs: {
          months: {
            date_histogram: {
              field: 'scheduledDate',
              calendar_interval: 'month',
              format: 'MMM'
            },
            aggs: {
              completed: {
                filter: { term: { status: 'completed' } }
              }
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

    // 4. Asset Type Distribution
    const typeDistRes = await this.elasticsearchService.search({
      index: 'inspections',
      body: {
        size: 0,
        aggs: {
          types: {
            terms: { field: 'type', size: 10 }
          }
        }
      }
    } as any);

    const typeAggs = (typeDistRes.aggregations as any)?.types?.buckets || [];
    const typeData = typeAggs.map((b: any) => ({
      type: b.key,
      value: b.doc_count,
      percentage: 0
    }));

    // Calculate percentages and add colors
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
