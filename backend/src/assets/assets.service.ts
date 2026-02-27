import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { EventsGateway } from '../events/events.gateway';
import { paginate } from '../common/utils/pagination.util';

@Injectable()
export class AssetsService implements OnModuleInit {
    private readonly logger = new Logger(AssetsService.name);
    constructor(
        private prisma: PrismaService,
        private elasticsearchService: ElasticsearchService,
        private configService: ConfigService,
        private eventsGateway: EventsGateway
    ) { }

    async onModuleInit() {
        await this.createIndex();
    }



    async create(data: Prisma.AssetCreateInput) {
        // assignedTemplates needs to be handled via 'connect' or 'connectOrCreate'
        // The DTO might be passing an array of IDs, but Prisma expects specific syntax
        const { assignedTemplates, ...rest } = data as any; // Cast to any to bypass strict type check for now if DTO mismatch

        // Auto-generate assetId if missing (e.g. from UI creation)
        if (!rest.assetId || rest.assetId.trim() === '') {
            const randomSuffix = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
            rest.assetId = `AST-${randomSuffix}`;
        }

        // Handle empty strings for optional fields
        if (rest.lastInspectionDate === '') {
            rest.lastInspectionDate = null;
        } else if (rest.lastInspectionDate) {
            rest.lastInspectionDate = new Date(rest.lastInspectionDate);
        }

        if (rest.inspectionFrequency === '') {
            rest.inspectionFrequency = null;
        }

        const createData: Prisma.AssetCreateInput = {
            ...rest,
            assignedTemplates: assignedTemplates && assignedTemplates.length > 0 ? {
                connect: assignedTemplates.map((id: string) => ({ id }))
            } : undefined
        };

        return this.prisma.asset.create({
            data: createData,
            include: { assignedTemplates: true } as any
        });
    }

    async findAll(page: number = 1, limit: number = 10) {
        return paginate(this.prisma.asset, {
            orderBy: { id: 'asc' },
        }, { page, limit });
    }

    async update(id: string, data: Prisma.AssetUpdateInput) {
        const { assignedTemplates, ...rest } = data as any;

        const updateData: any = {
            ...rest,
        };

        if (assignedTemplates) {
            updateData.assignedTemplates = {
                set: assignedTemplates.map((id: string) => ({ id }))
            };
        }

        return this.prisma.asset.update({
            where: { id: id as any },
            data: updateData,
            include: { assignedTemplates: true } as any
        });
    }

    async updateZone(data: any) {
        try {
            const zone = await (this.prisma as any).zone.upsert({
                where: { zoneId: data.zoneId },
                update: {
                    label: data.label,
                    x: data.x,
                    y: data.y,
                    width: data.width,
                    height: data.height,
                    updatedAt: new Date(data.timestamp || new Date())
                },
                create: {
                    zoneId: data.zoneId,
                    label: data.label,
                    x: data.x,
                    y: data.y,
                    width: data.width,
                    height: data.height,
                    updatedAt: new Date(data.timestamp || new Date())
                }
            });
            this.logger.log(`Updated zone in DB: ${zone.zoneId}`);

            // WebSocket Broadast
            this.eventsGateway.broadcast('zone_update', zone);

        } catch (error) {
            this.logger.error(`Failed to update zone ${data.zoneId}:`, error);
        }
    }

    private async createIndex() {
        const indexExists = await this.elasticsearchService.indices.exists({ index: 'assets' });
        if (!indexExists) {
            await this.elasticsearchService.indices.create({
                index: 'assets',
                body: {
                    mappings: {
                        properties: {
                            id: { type: 'keyword' },
                            assetId: { type: 'keyword' },
                            name: { type: 'text' },
                            type: { type: 'keyword' },
                            zone: { type: 'keyword' },
                            healthStatus: { type: 'keyword' },
                            linkedCameras: { type: 'integer' },
                            criticality: { type: 'integer' },
                            x: { type: 'float' },
                            y: { type: 'float' },
                            updatedAt: { type: 'date' }
                        }
                    }
                }
            } as any);
            this.logger.log('Created assets index with mapping');
        }
    }

    async updateAssetStatus(data: any) {
        this.logger.log(`Received asset update for ${data.assetId}`);
        try {
            // Step 1: DB Save (Source of Truth)
            const asset = await this.prisma.asset.upsert({
                where: { assetId: data.assetId },
                update: {
                    name: data.name,
                    type: data.type,
                    zone: data.zone,
                    healthStatus: data.healthStatus,
                    linkedCameras: data.linkedCameras,
                    criticality: data.criticality,
                    criticalityMax: data.criticalityMax,
                    x: data.x,
                    y: data.y,
                    lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : null,
                    inspectionFrequency: data.inspectionFrequency,
                    updatedAt: new Date(data.timestamp || new Date())
                } as any,
                create: {
                    assetId: data.assetId,
                    name: data.name,
                    type: data.type,
                    zone: data.zone,
                    healthStatus: data.healthStatus,
                    linkedCameras: data.linkedCameras,
                    criticality: data.criticality,
                    criticalityMax: data.criticalityMax,
                    x: data.x,
                    y: data.y,
                    lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : null,
                    inspectionFrequency: data.inspectionFrequency,
                    updatedAt: new Date(data.timestamp || new Date())
                } as any
            });

            this.logger.log(`Saved asset to DB: ${asset.assetId}`);

            // Step 3: WebSocket (UI Update)
            this.eventsGateway.broadcast('asset_update', asset as any);

            // Step 4: Elasticsearch Index (Async)
            this.elasticsearchService.index({
                index: 'assets',
                id: asset.assetId,
                document: {
                    id: asset.id,
                    assetId: asset.assetId as string,
                    name: asset.name,
                    type: asset.type,
                    zone: asset.zone,
                    healthStatus: asset.healthStatus,
                    linkedCameras: asset.linkedCameras,
                    criticality: asset.criticality,
                    x: asset.x,
                    y: asset.y,
                    updatedAt: new Date(),
                },
            } as any).catch(err => this.logger.error('Async Asset ES Indexing failed', err));

        } catch (error) {
            this.logger.error(`Failed to update asset ${data.assetId}:`, error);
        }
    }


    async remove(id: string) {
        const asset = await this.prisma.asset.findUnique({ where: { id } });
        if (asset) {
            // Delete related inspections first
            await this.prisma.inspection.deleteMany({
                where: { assetId: asset.assetId },
            });
        }
        return this.prisma.asset.delete({
            where: { id },
        });
    }

    async getSchemas() {
        return this.prisma.schemaLibrary.findMany({
            include: { fields: true } as any,
            orderBy: { id: 'asc' },
        });
    }

    async getTemplates() {
        return this.prisma.inspectionTemplate.findMany({
            include: { checklist: true } as any,
            orderBy: { id: 'asc' },
        });
    }

    async getConfig() {
        const schemas = await this.prisma.schemaLibrary.findMany({ select: { tags: true } as any });
        const assetTypes = Array.from(new Set(schemas.flatMap((s: any) => s.tags)));

        const zones = await (this.prisma as any).zone.findMany();

        return {
            assetTypes: assetTypes.length > 0 ? assetTypes : ['Motor', 'Pump', 'Valve', 'Tank', 'Conveyor', 'Heat Exchanger'],
            zones: zones.map((z: any) => z.label),
            healthStatuses: ['good', 'warning', 'critical']
        };
    }

    async createSchema(data: Prisma.SchemaLibraryCreateInput) {
        return this.prisma.schemaLibrary.create({
            data,
            include: { fields: true },
        });
    }

    async createTemplate(data: Prisma.InspectionTemplateCreateInput) {
        return this.prisma.inspectionTemplate.create({
            data,
            include: { checklist: true },
        });
    }
}
