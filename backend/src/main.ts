
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKERS ?? 'localhost:9092'],
      },
      consumer: {
        groupId: 'traffic-consumer-v2',
      },
      subscribe: {
        fromBeginning: true,
      },
    },
  });

  await app.startAllMicroservices();
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
