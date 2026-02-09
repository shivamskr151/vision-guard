import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class AssetsService implements OnModuleInit {
    private readonly logger = new Logger(AssetsService.name);
    constructor(
        private prisma: PrismaService,
        private elasticsearchService: ElasticsearchService
    ) { }

    async onModuleInit() {
        // await this.seed();
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

    async seed() {
        try {
            console.log('Seeding Assets Registry...');

            // Seed Zones
            const zonesData = [
                { zoneId: 'z1', label: 'North Plant', x: 2, y: 5, width: 30, height: 25 },
                { zoneId: 'z2', label: 'Processing Unit A', x: 35, y: 5, width: 30, height: 25 },
                { zoneId: 'z3', label: 'Storage Area', x: 68, y: 10, width: 30, height: 25 },
                { zoneId: 'z4', label: 'Processing Unit B', x: 5, y: 35, width: 40, height: 25 },
                { zoneId: 'z5', label: 'South Plant', x: 50, y: 35, width: 45, height: 25 },
            ];

            const zoneMap: Record<string, typeof zonesData[0]> = {};

            for (const zone of zonesData) {
                await (this.prisma as any).zone.upsert({
                    where: { zoneId: zone.zoneId },
                    update: zone,
                    create: zone
                });
                zoneMap[zone.label] = zone;
            }

            const getRandomCoord = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);

            // Always check and backfill coordinates if needed
            const assetsWithoutCoords = await this.prisma.asset.findMany({ where: { x: 0, y: 0 } });
            if (assetsWithoutCoords.length > 0) {
                console.log(`Found ${assetsWithoutCoords.length} assets without coordinates. Backfilling...`);
                for (const asset of assetsWithoutCoords) {
                    const zoneDef = zoneMap[asset.zone];
                    const x = zoneDef ? getRandomCoord(zoneDef.x, zoneDef.x + zoneDef.width) : 0;
                    const y = zoneDef ? getRandomCoord(zoneDef.y, zoneDef.y + zoneDef.height) : 0;
                    await this.prisma.asset.update({ where: { id: asset.id }, data: { x, y } });
                }
                console.log('Backfill complete.');
            }

            // 1. Seed/Update Rotating Equipment Standard Schema
            // This runs first to ensure fields are always up to date
            const rotatingSchemaData = {
                title: 'Rotating Equipment Standard', description: 'Standard schema for motors, pumps, and rotating machinery', fieldCount: 10, tags: ['Motor', 'Pump'], created: '01/06/2025',
                fields: [
                    { label: 'Manufacturer', type: 'Text', required: true },
                    { label: 'Model Number', type: 'Text', required: true },
                    { label: 'Serial Number', type: 'Text', required: true },
                    { label: 'Installation Date', type: 'Date', required: true },
                    { label: 'Power Rating', type: 'Text', required: true },
                    { label: 'Voltage', type: 'Text', required: true },
                    { label: 'RPM', type: 'Text', required: false },
                    { label: 'Bearing Type', type: 'Text', required: false },
                    { label: 'Lubrication Type', type: 'Select', required: true, options: ['Grease', 'Oil', 'Solid', 'Gas'] },
                    { label: 'Enclosure Type', type: 'Select', required: false, options: ['TEFC', 'ODP', 'TENV', 'TEAO'] },
                ]
            };

            const existingRotating = await this.prisma.schemaLibrary.findFirst({ where: { title: rotatingSchemaData.title } });

            if (existingRotating) {
                // Update existing
                await this.prisma.customField.deleteMany({ where: { schemaId: existingRotating.id } });
                for (const field of rotatingSchemaData.fields) {
                    await this.prisma.customField.create({
                        data: {
                            ...field,
                            schemaId: existingRotating.id
                        }
                    });
                }
                console.log('Updated fields for Rotating Equipment Standard');
            } else {
                // Create new
                await this.prisma.schemaLibrary.create({
                    data: {
                        ...rotatingSchemaData,
                        fields: {
                            create: rotatingSchemaData.fields
                        }
                    }
                });
                console.log('Created Rotating Equipment Standard');
            }

            // 2. Seed/Update Basic Asset Profile Schema
            const basicSchemaData = {
                title: 'Basic Asset Profile', description: 'Minimal schema for quick asset registration', fieldCount: 5, tags: ['Motor', 'Pump', 'Valve', 'Tank', 'Conveyor', 'Heat Exchanger'], created: '01/09/2025',
                fields: [
                    { label: 'Manufacturer', type: 'Text', required: true },
                    { label: 'Model Number', type: 'Text', required: false },
                    { label: 'Installation Date', type: 'Date', required: true },
                    { label: 'Under Warranty', type: 'Boolean', required: false },
                ]
            };

            console.log('Finding Basic Asset Profile schema...');
            const existingBasic = await this.prisma.schemaLibrary.findFirst({ where: { title: basicSchemaData.title } });

            if (existingBasic) {
                console.log('Found existing Basic Asset Profile. Updating fields...');
                // Delete existing fields to ensure clean state
                const deleted = await this.prisma.customField.deleteMany({ where: { schemaId: existingBasic.id } });
                console.log(`Deleted ${deleted.count} existing fields.`);

                for (const field of basicSchemaData.fields) {
                    await this.prisma.customField.create({
                        data: { ...field, schemaId: existingBasic.id }
                    });
                }
                console.log('Re-created fields for Basic Asset Profile');
            } else {
                console.log('Basic Asset Profile not found. Creating new...');
                await this.prisma.schemaLibrary.create({
                    data: {
                        ...basicSchemaData,
                        fields: { create: basicSchemaData.fields }
                    }
                });
                console.log('Created Basic Asset Profile with fields');
            }

            const assetCount = await this.prisma.asset.count();
            const schemaCount = await this.prisma.schemaLibrary.count();
            const templateCount = await this.prisma.inspectionTemplate.count();

            if (assetCount > 0 && schemaCount > 0 && templateCount > 0) {
                return { message: 'Registry seeded / updated' };
            }

            // 2. Seed Assets

            const mockAssets = [
                { assetId: 'AST-001', name: 'Primary Motor 1A', type: 'Motor', zone: 'North Plant', healthStatus: 'good', linkedCameras: 2, criticality: 9, criticalityMax: 10 },
                { assetId: 'AST-002', name: 'Cooling Pump CP-7', type: 'Pump', zone: 'Processing Unit A', healthStatus: 'warning', linkedCameras: 1, criticality: 8, criticalityMax: 10 },
                { assetId: 'AST-003', name: 'Control Valve V-23', type: 'Valve', zone: 'South Plant', healthStatus: 'critical', linkedCameras: 2, criticality: 10, criticalityMax: 10 },
                { assetId: 'AST-004', name: 'Storage Tank T-101', type: 'Tank', zone: 'Storage Area', healthStatus: 'good', linkedCameras: 1, criticality: 7, criticalityMax: 10 },
                { assetId: 'AST-005', name: 'Conveyor Belt CB-5', type: 'Conveyor', zone: 'Processing Unit B', healthStatus: 'warning', linkedCameras: 2, criticality: 6, criticalityMax: 10 },
                { assetId: 'AST-006', name: 'Heat Exchanger HX-12', type: 'Heat Exchanger', zone: 'Processing Unit A', healthStatus: 'good', linkedCameras: 1, criticality: 8, criticalityMax: 10 },
            ];
            if (assetCount === 0) {
                for (const asset of mockAssets) {
                    const zoneDef = zoneMap[asset.zone];
                    const x = zoneDef ? getRandomCoord(zoneDef.x, zoneDef.x + zoneDef.width) : 0;
                    const y = zoneDef ? getRandomCoord(zoneDef.y, zoneDef.y + zoneDef.height) : 0;
                    await this.prisma.asset.create({ data: { ...asset, x, y } });
                }
            }

            // 2. Seed Assets

            const otherSchemas = [
                {
                    title: 'Valve & Control Equipment', description: 'Schema for valves and control equipment with actuation details', fieldCount: 9, tags: ['Valve'], created: '15/06/2025',
                    fields: { create: [] }
                },
                {
                    title: 'Pressure Vessels & Tanks', description: 'Comprehensive schema for tanks and pressure vessels', fieldCount: 10, tags: ['Tank'], created: '01/07/2025',
                    fields: { create: [] }
                },
                {
                    title: 'Material Handling Equipment', description: 'Schema for conveyors and material handling systems', fieldCount: 9, tags: ['Conveyor'], created: '15/07/2025',
                    fields: { create: [] }
                },
                {
                    title: 'Heat Transfer Equipment', description: 'Detailed schema for heat exchangers and thermal equipment', fieldCount: 10, tags: ['Heat Exchanger'], created: '01/08/2025',
                    fields: { create: [] }
                },
            ];

            for (const schema of otherSchemas) {
                const existing = await this.prisma.schemaLibrary.findFirst({ where: { title: schema.title } });
                if (!existing) {
                    await this.prisma.schemaLibrary.create({ data: schema });
                }
            }

            // 3. Seed Templates
            if (templateCount === 0) {
                const mockTemplates = [
                    {
                        title: 'Rotating Equipment - Monthly', description: 'Monthly visual and operational inspection for motors and pumps', questionCount: 8, durationMinutes: 25, tags: ['Motor', 'Pump'], frequencyDays: 30, mandatoryChecks: 6, mandatoryTotal: 8, created: '01/06/2025',
                        checklist: {
                            create: [
                                { text: 'Structural integrity check', mandatory: true, passFailCondition: true },
                                { text: 'Visual wear assessment', mandatory: true, passFailCondition: true },
                                { text: 'Connection points secure', mandatory: false, passFailCondition: true },
                            ]
                        }
                    },
                    {
                        title: 'Valve Inspection - Quarterly', description: 'Quarterly inspection for valves and control equipment', questionCount: 7, durationMinutes: 20, tags: ['Valve'], frequencyDays: 90, mandatoryChecks: 5, mandatoryTotal: 7, created: '15/06/2025',
                        checklist: { create: [] }
                    },
                    {
                        title: 'Tank External Inspection', description: 'External inspection for tanks and pressure vessels', questionCount: 8, durationMinutes: 45, tags: ['Tank'], frequencyDays: 90, mandatoryChecks: 6, mandatoryTotal: 8, created: '01/07/2025',
                        checklist: { create: [] }
                    },
                    {
                        title: 'Conveyor Belt Inspection', description: 'Routine inspection for conveyors and material handling', questionCount: 8, durationMinutes: 20, tags: ['Conveyor'], frequencyDays: 14, mandatoryChecks: 6, mandatoryTotal: 8, created: '15/07/2025',
                        checklist: { create: [] }
                    },
                    {
                        title: 'Heat Exchanger - Monthly', description: 'Monthly thermal and visual inspection for heat exchangers', questionCount: 7, durationMinutes: 30, tags: ['Heat Exchanger'], frequencyDays: 30, mandatoryChecks: 4, mandatoryTotal: 7, created: '01/08/2025',
                        checklist: { create: [] }
                    },
                    {
                        title: 'Emergency/Breakdown Inspection', description: 'Quick inspection for emergency or breakdown scenarios', questionCount: 5, durationMinutes: 15, tags: ['Motor', 'Pump', 'Valve', 'Tank', 'Conveyor', 'Heat Exchanger'], frequencyDays: 0, mandatoryChecks: 4, mandatoryTotal: 5, created: '01/09/2025',
                        checklist: { create: [] }
                    },
                    {
                        title: 'Annual Compliance Audit', description: 'Full annual compliance audit for all asset types', questionCount: 7, durationMinutes: 60, tags: ['Motor', 'Pump', 'Valve', 'Tank', 'Conveyor', 'Heat Exchanger'], frequencyDays: 365, mandatoryChecks: 5, mandatoryTotal: 7, created: '01/10/2025',
                        checklist: { create: [] }
                    },
                    {
                        title: 'Vision-Automated Quick Check', description: 'Short vision-automated check for rapid assessment', questionCount: 4, durationMinutes: 10, tags: ['Motor', 'Pump', 'Valve', 'Tank', 'Conveyor', 'Heat Exchanger'], frequencyDays: 7, mandatoryChecks: 3, mandatoryTotal: 4, created: '01/11/2025',
                        checklist: { create: [] }
                    },
                ];
                for (const tmpl of mockTemplates) {
                    await this.prisma.inspectionTemplate.create({ data: tmpl });
                }
            }

            return { message: 'Registry seeded successfully' };
        } catch (error) {
            console.error('Error seeding assets:', error);
            throw error;
        }
    }
}
