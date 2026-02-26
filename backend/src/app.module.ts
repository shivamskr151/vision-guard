import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AssetsModule } from './assets/assets.module';
import { PrismaModule } from './prisma/prisma.module';
import { InspectionsModule } from './inspections/inspections.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AnomaliesModule } from './anomalies/anomalies.module';
import { EventsModule } from './events/events.module';
import { KafkaModule } from './kafka/kafka.module';
import { SharedElasticsearchModule } from './elasticsearch/elasticsearch.module';

import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    SharedElasticsearchModule,
    AssetsModule,
    PrismaModule,
    InspectionsModule,
    TelemetryModule,
    AnomaliesModule,
    EventsModule,
    KafkaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
