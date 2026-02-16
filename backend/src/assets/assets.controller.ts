import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Prisma } from '@prisma/client';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller('assets')
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) { }

    @EventPattern('asset_updates')
    async handleAssetUpdates(@Payload() data: any) {
        await this.assetsService.updateAssetStatus(data);
    }

    @EventPattern('zone_updates')
    async handleZoneUpdates(@Payload() data: any) {
        await this.assetsService.updateZone(data);
    }

    @Post()
    create(@Body() createAssetDto: Prisma.AssetCreateInput) {
        return this.assetsService.create(createAssetDto);
    }

    @Get()
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.assetsService.findAll(Number(page), Number(limit));
    }



    @Get('schemas')
    getSchemas() {
        return this.assetsService.getSchemas();
    }

    @Post('schemas')
    createSchema(@Body() createSchemaDto: Prisma.SchemaLibraryCreateInput) {
        return this.assetsService.createSchema(createSchemaDto);
    }

    @Get('templates')
    getTemplates() {
        return this.assetsService.getTemplates();
    }

    @Post('templates')
    createTemplate(@Body() createTemplateDto: Prisma.InspectionTemplateCreateInput) {
        return this.assetsService.createTemplate(createTemplateDto);
    }

    @Get('config')
    getConfig() {
        return this.assetsService.getConfig();
    }

    @Post(':id')
    updatePost(@Param('id') id: string, @Body() updateAssetDto: Prisma.AssetUpdateInput) {
        return this.assetsService.update(+id, updateAssetDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateAssetDto: Prisma.AssetUpdateInput) {
        return this.assetsService.update(+id, updateAssetDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.assetsService.remove(+id);
    }
}
