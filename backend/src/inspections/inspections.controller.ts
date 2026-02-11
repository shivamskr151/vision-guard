import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InspectionsService } from './inspections.service';

import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';

@Controller('inspections')
export class InspectionsController {
  constructor(
    private readonly inspectionsService: InspectionsService,
  ) { }

  @EventPattern('inspection_updates')
  async handleInspectionUpdate(@Payload() data: any) {
    await this.inspectionsService.processInspectionUpdate(data);
  }



  @Post('sync')
  sync() {
    return this.inspectionsService.sync();
  }

  @Get('dashboard')
  getDashboardData() {
    return this.inspectionsService.getDashboardData();
  }

  @Get('upcoming')
  getUpcoming() {
    return this.inspectionsService.getUpcoming();
  }

  @Get('reports')
  getReports() {
    return this.inspectionsService.getReports();
  }

  @Post()
  create(@Body() createInspectionDto: CreateInspectionDto) {
    return this.inspectionsService.create(createInspectionDto);
  }

  @Get()
  findAll() {
    return this.inspectionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inspectionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInspectionDto: UpdateInspectionDto) {
    return this.inspectionsService.update(+id, updateInspectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inspectionsService.remove(+id);
  }
}
