import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class InspectionsProducerService implements OnModuleInit {
    private readonly logger = new Logger(InspectionsProducerService.name);
    private inspectionCounter = 10000; // Start from high number to avoid conflicts

    constructor(
        @Inject('INSPECTION_SERVICE') private readonly kafkaClient: ClientKafka,
    ) { }

    async onModuleInit() {
        await this.kafkaClient.connect();
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

                this.kafkaClient.emit('inspection_updates', payload);
                this.logger.verbose(`Emitted NEW inspection for ${payload.assetId} (ID: ${payload.inspectionId})`);
            } catch (error) {
                this.logger.error('Error in inspection stream', error);
            }
        }, 8000); // Every 8 seconds
    }
}
