import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnomaliesController } from './anomalies.controller';
import { AnomaliesService } from './anomalies.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AnomaliesProducerService } from './anomalies.producer.service';

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
        name: 'ANOMALY_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'anomaly',
              brokers: (configService.get<string>('KAFKA_BROKERS') ?? 'localhost:9092').split(','),
            },
            consumer: {
              groupId: 'anomaly-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AnomaliesController],
  providers: [AnomaliesService, AnomaliesProducerService],
})
export class AnomaliesModule { }
