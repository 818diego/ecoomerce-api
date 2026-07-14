import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  ApiResponse,
  NestErrorResponse,
} from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // Se resuelve aquí dentro y no en el constructor: en el momento del
    // bootstrap HttpAdapterHost puede no estar inicializado todavía.
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse: NestErrorResponse | string | undefined =
      exception instanceof HttpException
        ? (exception.getResponse() as NestErrorResponse | string)
        : undefined;
    const message = this.extractMessage(errorResponse);
    // Solo loggeamos stack completo en errores 500: el resto son errores
    // de cliente esperados (4xx) y no queremos contaminar los logs.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `[${status}] ${message}`,
        stack,
        AllExceptionsFilter.name,
      );
    }
    const body: ApiResponse<null> = {
      success: false,
      error: message,
      message: 'Operación fallida',
      data: null,
    };
    httpAdapter.reply(ctx.getResponse(), body, status);
  }

  private extractMessage(
    errorResponse: NestErrorResponse | string | undefined,
  ): string {
    if (typeof errorResponse === 'string') {
      return errorResponse;
    }
    if (errorResponse && typeof errorResponse === 'object') {
      const msg = errorResponse.message;
      if (Array.isArray(msg)) {
        return msg.join(', ');
      }
      if (typeof msg === 'string') {
        return msg;
      }
      if (typeof errorResponse.error === 'string') {
        return errorResponse.error;
      }
    }
    return 'Error desconocido';
  }
}