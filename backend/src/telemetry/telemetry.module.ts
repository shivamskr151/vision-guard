import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        PrismaModule,
        EventsModule,
        ElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                node: configService.get<string>('ELASTICSEARCH_NODE'),
            }),
            inject: [ConfigService],
        }),

    ],
    controllers: [TelemetryController],
    providers: [TelemetryService],
})
export class TelemetryModule { }
