import { Module } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';
import { InspectionsProducerService } from './inspections.producer.service';
import { InspectionsConsumerService } from './inspections.consumer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventsModule } from '../events/events.module';

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
        name: 'INSPECTION_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'inspection',
              brokers: (
                configService.get<string>('KAFKA_BROKERS') ?? 'localhost:9092'
              ).split(','),
            },
            consumer: {
              groupId: 'inspection-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    EventsModule,
  ],
  controllers: [InspectionsController],
  providers: [
    InspectionsService,
    InspectionsProducerService,
    InspectionsConsumerService,
  ],
})
export class InspectionsModule { }
