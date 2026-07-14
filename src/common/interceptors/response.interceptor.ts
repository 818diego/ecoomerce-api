import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

// Nota: este interceptor NO envuelve respuestas de controllers que usen
// el decorador @Res() (ni @Res({ passthrough: false })). En esos casos
// Nest delega el control total del objeto Response al handler (típico
// para streams, descargas de archivos, redirects, SSE, etc.) y el
// pipeline de interceptors se omite para esa respuesta concreta.
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        error: null,
        message: 'Operación exitosa',
        data: (data ?? null) as T | null,
      })),
    );
  }
}