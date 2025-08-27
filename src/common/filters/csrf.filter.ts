import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(ForbiddenException)
export class CsrfExceptionFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception.message?.includes('CSRF')) {
      response.status(403).json({
        statusCode: 403,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: 'CSRF token validation failed',
        error: 'Forbidden',
      });
    } else {
      response.status(403).json({
        statusCode: 403,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: exception.message || 'Forbidden',
        error: 'Forbidden',
      });
    }
  }
}
