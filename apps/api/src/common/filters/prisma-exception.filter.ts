import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('PrismaExceptionFilter');

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.BAD_REQUEST;
    let message: string = exception.message;

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || ['field'];
        message = `Unique constraint violation on: ${target.join(', ')}`;
        break;
      }
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint failed';
        break;
      case 'P2014':
        status = HttpStatus.BAD_REQUEST;
        message = 'Required relation violation';
        break;
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: 'Database Error',
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
