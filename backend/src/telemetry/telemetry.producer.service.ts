import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ClientKafka } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelemetryProducerService implements OnModuleInit {
    private readonly logger = new Logger(TelemetryProducerService.name);

    constructor(
        @Inject('TELEMETRY_SERVICE') private readonly kafkaClient: ClientKafka,
        private readonly prisma: PrismaService,
    ) { }

    async onModuleInit() {
        await this.kafkaClient.connect();
        this.startTelemetryStream();
    }

    private startTelemetryStream() {
        this.logger.log('Starting Asset Telemetry Stream from CSV...');
        const csvPath = path.join(process.cwd(), 'Data', 'telemetry_data.csv');

        setInterval(async () => {
            try {
                if (!fs.existsSync(csvPath)) {
                    this.logger.warn(`CSV file not found at ${csvPath}`);
                    return;
                }

                const fileContent = fs.readFileSync(csvPath, 'utf-8');
                const lines = fileContent.split('\n').filter(line => line.trim() !== '');
                const headers = lines[0].split(',');

                // Skip header, pick random line or iterate
                // For demo: pick random line from CSV to simulate stream
                const randomLine = lines[Math.floor(Math.random() * (lines.length - 1)) + 1];
                const values = randomLine.split(',');

                const assetId = values[0];
                const assetInspection = parseInt(values[1]);
                const assetOverdue = parseInt(values[2]);
                const activeAnomalies = parseInt(values[3]);
                const inspectionCompliance = parseFloat(values[4]);
                const criticalAssetRiskIndex = parseFloat(values[5]);

                const status = activeAnomalies > 150 ? 'critical' : (activeAnomalies > 100 ? 'warning' : 'normal');

                const payload = {
                    timestamp: new Date().toISOString(),
                    assetId,
                    assetInspection,
                    assetOverdue,
                    activeAnomalies,
                    inspectionCompliance,
                    criticalAssetRiskIndex,
                    status
                };

                this.kafkaClient.emit('asset_telemetry', payload);
                this.logger.verbose(`Emitted CSV telemetry for ${assetId}`);

            } catch (error) {
                this.logger.error('Error in telemetry stream', error);
            }
        }, 2000); // Update every 2 seconds
    }
}
