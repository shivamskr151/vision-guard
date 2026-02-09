import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AssetsModule } from './assets/assets.module';
import { PrismaModule } from './prisma/prisma.module';
import { InspectionsModule } from './inspections/inspections.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AnomaliesModule } from './anomalies/anomalies.module';
import { ElasticsearchModule } from '@nestjs/elasticsearch';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    }),
    AssetsModule,
    PrismaModule,
    InspectionsModule,
    TelemetryModule,
    AnomaliesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
