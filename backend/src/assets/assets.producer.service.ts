import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class AssetsProducerService implements OnModuleInit {
    private readonly logger = new Logger(AssetsProducerService.name);

    constructor(
        @Inject('ASSET_SERVICE') private readonly kafkaClient: ClientKafka,
    ) { }

    async onModuleInit() {
        await this.kafkaClient.connect();
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

                this.kafkaClient.emit('asset_updates', payload);
                this.logger.verbose(`Emitted asset update for ${payload.assetId}`);
            } catch (error) {
                this.logger.error('Error in asset stream', error);
            }
        }, 5000); // Every 5 seconds
    }
}
