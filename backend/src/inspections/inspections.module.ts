import { Module } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
  ],
  controllers: [InspectionsController],
  providers: [
    InspectionsService,
  ],
})
export class InspectionsModule { }
