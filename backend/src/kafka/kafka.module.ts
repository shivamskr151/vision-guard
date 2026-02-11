import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './producer/kafka.producer.service';
import { KafkaConsumerService } from './consumer/kafka.consumer.service';

@Global()
@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: 'KAFKA_SERVICE',
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => ({
                    transport: Transport.KAFKA,
                    options: {
                        client: {
                            clientId: 'vision-guard-producer',
                            brokers: (configService.get<string>('KAFKA_BROKERS') ?? 'localhost:9092').split(','),
                        },
                        consumer: {
                            groupId: 'vision-guard-producer-group',
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    providers: [KafkaProducerService, KafkaConsumerService],
    exports: [ClientsModule, KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule { }
