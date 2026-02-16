import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message:
        exception instanceof HttpException
          ? exception.getResponse()
          : 'Internal server error',
    };

    // Log the error for internal tracking (includes stack trace)
    this.logger.error(
      `Exception thrown at ${responseBody.path}: ${
        exception instanceof Error ? exception.stack : JSON.stringify(exception)
      }`,
    );

    // Sanitize message for production if it's not a known HttpException
    if (!(exception instanceof HttpException)) {
      responseBody.message = 'An unexpected error occurred. Please contact support.';
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
