import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userId = request.user?.id || 'anonymous';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - now;
        const statusCode = context.switchToHttp().getResponse().statusCode;

        if (elapsed > 1000) {
          this.logger.warn(`${method} ${url} ${statusCode} ${elapsed}ms user=${userId} ip=${ip}`);
        } else {
          this.logger.log(`${method} ${url} ${statusCode} ${elapsed}ms user=${userId}`);
        }
      }),
    );
  }
}
