import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    try {
      await this.kafkaClient.connect();
      this.logger.log('Kafka Producer connected successfully');
    } catch (error) {
      this.logger.error('Error connecting to Kafka Producer', error);
    }
  }

  async onModuleDestroy() {
    await this.kafkaClient.close();
  }

  emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
    return this.kafkaClient.emit<TResult, TInput>(pattern, data);
  }
}
