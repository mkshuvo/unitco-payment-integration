import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMetadata = this.reflector.getAllAndOverride<AuditMetadata>(
      AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const resourceId = auditMetadata.resourceIdParam
            ? request.params[auditMetadata.resourceIdParam] ||
              response?.id?.toString() ||
              response?.data?.id?.toString()
            : undefined;

          await this.auditService.log({
            userId: user?.id,
            action: auditMetadata.action,
            resourceType: auditMetadata.resourceType,
            resourceId,
            metadata: {
              method: request.method,
              url: request.url,
              body: request.body,
              params: request.params,
              query: request.query,
            },
            ipAddress: request.ip || request.connection?.remoteAddress,
            userAgent: request.get('User-Agent'),
          });
        } catch (error) {
          // Log audit failures but don't break the request
          console.error('Audit logging failed:', error);
        }
      }),
    );
  }
}
