import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ClientKafka } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnomaliesProducerService implements OnModuleInit {
    private readonly logger = new Logger(AnomaliesProducerService.name);

    constructor(
        @Inject('ANOMALY_SERVICE') private readonly kafkaClient: ClientKafka,
        private readonly prisma: PrismaService,
    ) { }

    async onModuleInit() {
        await this.kafkaClient.connect();
        this.startSimulation();
    }

    private startSimulation() {
        this.logger.log('Starting Anomaly Simulation from CSV...');
        const csvPath = path.join(process.cwd(), 'Data', 'anomaly_data.csv');

        setInterval(async () => {
            try {
                if (!fs.existsSync(csvPath)) {
                    this.logger.warn(`CSV file not found at ${csvPath}`);
                    return;
                }

                const fileContent = fs.readFileSync(csvPath, 'utf-8');
                const lines = fileContent.split('\n').filter(line => line.trim() !== '');
                // Skip header, pick random
                const randomLine = lines[Math.floor(Math.random() * (lines.length - 1)) + 1];
                const values = randomLine.split(',');

                const assetId = values[0];
                const type = values[1];
                const severity = values[2];
                const description = values[3];
                const location = values[4];
                const confidence = values[5];

                const payload = {
                    timestamp: new Date().toISOString(),
                    severity,
                    type,
                    description,
                    assetId,
                    location,
                    confidence,
                    isResolved: 'false'
                };

                this.kafkaClient.emit('anomaly_events', payload);
                this.logger.log(`Emitted CSV anomaly_events: ${assetId} - ${type}`);

            } catch (error) {
                this.logger.error('Error in simulation loop', error);
            }
        }, 10000); // Every 10 seconds
    }
}
