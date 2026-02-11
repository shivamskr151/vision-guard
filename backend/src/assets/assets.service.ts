import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { KafkaProducerService } from '../kafka/producer/kafka.producer.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AssetsService implements OnModuleInit {
    private readonly logger = new Logger(AssetsService.name);
    constructor(
        private prisma: PrismaService,
        private elasticsearchService: ElasticsearchService,
        private kafkaProducerService: KafkaProducerService
    ) { }

    async onModuleInit() {
        this.startAssetStream();
    }

    private startAssetStream() {
        this.logger.log('Starting Asset Stream from CSV...');
        const csvPath = path.join(process.cwd(), 'Data', 'asset_updates.csv');

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

                const payload = {
                    timestamp: new Date().toISOString(),
                    assetId: values[0],
                    name: values[1],
                    type: values[2],
                    zone: values[3],
                    healthStatus: values[4],
                    linkedCameras: parseInt(values[5]),
                    criticality: parseInt(values[6]),
                    criticalityMax: parseInt(values[7]),
                    x: parseFloat(values[8]),
                    y: parseFloat(values[9]),
                    lastInspectionDate: values[10],
                    inspectionFrequency: parseInt(values[11]),
                };

                this.kafkaProducerService.emit('asset_updates', payload);
                this.logger.verbose(`Emitted asset update for ${payload.assetId}`);
            } catch (error) {
                this.logger.error('Error in asset stream', error);
            }
        }, 5000); // Every 5 seconds
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
                connect: assignedTemplates.map((id: string) => ({ id: Number(id) }))
            } : undefined
        };

        return this.prisma.asset.create({
            data: createData,
            include: { assignedTemplates: true } as any
        });
    }

    async findAll() {
        return this.prisma.asset.findMany({
            orderBy: { id: 'asc' },
        });
    }

    async update(id: number, data: Prisma.AssetUpdateInput) {
        const { assignedTemplates, ...rest } = data as any;

        const updateData: any = {
            ...rest,
        };

        if (assignedTemplates) {
            updateData.assignedTemplates = {
                set: assignedTemplates.map((id: string) => ({ id: Number(id) }))
            };
        }

        return this.prisma.asset.update({
            where: { id },
            data: updateData,
            include: { assignedTemplates: true } as any
        });
    }

    async updateAssetStatus(data: any) {
        this.logger.log(`Received asset update: ${data.assetId}`);
        try {
            // 1. Upsert Asset in PostgreSQL
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

            // 2. Index to Elasticsearch
            await this.elasticsearchService.index({
                index: 'assets',
                id: asset.assetId,
                document: {
                    id: asset.id,
                    assetId: asset.assetId,
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
            } as any);

            this.logger.log(`Indexed asset in Elasticsearch: ${asset.assetId}`);
        } catch (error) {
            this.logger.error(`Failed to update asset ${data.assetId}:`, error);
        }
    }

    async remove(id: number) {
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
