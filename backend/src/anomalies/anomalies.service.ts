import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { KafkaProducerService } from '../kafka/producer/kafka.producer.service';
import * as fs from 'fs';
import * as path from 'path';

import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class AnomaliesService implements OnModuleInit {
    private readonly logger = new Logger(AnomaliesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly elasticsearchService: ElasticsearchService,
        private readonly eventsGateway: EventsGateway,
        private readonly kafkaProducerService: KafkaProducerService,
    ) { }

    async onModuleInit() {
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

                this.kafkaProducerService.emit('anomaly_events', payload);
                this.logger.log(`Emitted CSV anomaly_events: ${assetId} - ${type}`);

            } catch (error) {
                this.logger.error('Error in simulation loop', error);
            }
        }, 10000); // Every 10 seconds
    }

    @EventPattern('anomaly_events')
    async processAnomalyData(@Payload() data: any) {
        this.logger.log('Received anomaly data:', data);

        try {
            // Save to PostgreSQL
            const savedData = await this.prisma.anomalyEvent.create({
                data: {
                    timestamp: new Date(data.timestamp),
                    severity: data.severity,
                    type: data.type,
                    description: data.description,
                    assetId: data.assetId,
                    location: data.location,
                    confidence: parseFloat(data.confidence),
                    isResolved: data.isResolved === 'true',
                },
            });
            this.logger.log(`Saved Anomaly to DB with ID: ${savedData.id}`);

            // Save to Elasticsearch
            await this.elasticsearchService.index({
                index: 'anomaly_events',
                document: {
                    id: savedData.id,
                    timestamp: savedData.timestamp,
                    severity: savedData.severity,
                    type: savedData.type,
                    description: savedData.description,
                    assetId: savedData.assetId,
                    location: savedData.location,
                    confidence: savedData.confidence,
                    isResolved: savedData.isResolved,
                },
            });
            this.logger.log('Indexed Anomaly in Elasticsearch');

            // Emit Real-time Update
            this.eventsGateway.broadcast('anomaly', savedData);

        } catch (error) {
            this.logger.error('Error processing anomaly data', error);
        }
    }
}
