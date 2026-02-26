
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { WsAdapter } from '@nestjs/platform-ws';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips non-decorated properties from DTOs
      forbidNonWhitelisted: true, // Throws error if extra properties are sent
      transform: true, // Automatically transforms payloads to DTO instances
    }),
  );

  // 2. Enable Centralized Error Handling
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // 3. Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  app.useWebSocketAdapter(new WsAdapter(app));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port')!;
  const kafkaBrokers = configService.get<string>('kafka.brokers')!;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [kafkaBrokers],
      },
      consumer: {
        groupId: configService.get<string>('kafka.consumerGroup')!,
      },
      subscribe: {
        fromBeginning: true,
      },
    },
  });

  await app.startAllMicroservices();
  app.enableCors();
  await app.listen(port);
}
bootstrap();

