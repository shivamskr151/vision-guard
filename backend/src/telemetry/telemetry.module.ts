import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { TelemetryController } from './telemetry.controller';
import { TelemetryProducerService } from './telemetry.producer.service';
import { TelemetryConsumerService } from './telemetry.consumer.service';

@Module({
    imports: [
        PrismaModule,
        ElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                node: configService.get<string>('ELASTICSEARCH_NODE'),
            }),
            inject: [ConfigService],
        }),
        ClientsModule.registerAsync([
            {
                name: 'TELEMETRY_SERVICE',
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => ({
                    transport: Transport.KAFKA,
                    options: {
                        client: {
                            clientId: 'telemetry',
                            brokers: (configService.get<string>('KAFKA_BROKERS') ?? 'localhost:9092').split(','),
                        },
                        consumer: {
                            groupId: 'telemetry-consumer',
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    controllers: [TelemetryController],
    providers: [TelemetryProducerService, TelemetryConsumerService],
})
export class TelemetryModule { }
