import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TelemetryConsumerService } from './telemetry.consumer.service';

@Controller('telemetry')
export class TelemetryController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly telemetryConsumerService: TelemetryConsumerService
    ) { }

    @EventPattern('asset_telemetry')
    async handleTelemetry(@Payload() data: any) {
        await this.telemetryConsumerService.saveTelemetry(data);
    }

    @Get('latest')
    async getLatestTelemetry() {
        // Get distinct latest telemetry for each asset
        // Since Prisma doesn't support SELECT DISTINCT ON easily, we fetch recent and dedupe in app or use raw query
        // For simplicity/demo: Fetch last 50 records
        return this.prisma.assetTelemetry.findMany({
            take: 50,
            orderBy: { timestamp: 'desc' },
            include: { asset: true }
        });
    }

    @Get('stats')
    async getStats() {
        // Basic stats for dashboard
        const total = await this.prisma.assetTelemetry.count();
        const critical = await this.prisma.assetTelemetry.count({ where: { status: 'critical' } });
        return { total, critical };
    }
}
