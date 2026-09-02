import { Injectable, LoggerService, Logger } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger = new Logger('App');

  log(message: string, context?: string) {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, context);
  }

  logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string) {
    const msg = `${method} ${url} ${statusCode} ${duration}ms${userId ? ` user=${userId}` : ''}`;

    if (statusCode >= 500) {
      this.logger.error(msg);
    } else if (statusCode >= 400) {
      this.logger.warn(msg);
    } else {
      this.logger.log(msg);
    }
  }

  logAudit(action: string, entityType: string, entityId: string, userId?: string, details?: unknown) {
    this.logger.log(`[AUDIT] ${action} ${entityType}:${entityId} by=${userId || 'system'} ${JSON.stringify(details || {})}`);
  }
}
