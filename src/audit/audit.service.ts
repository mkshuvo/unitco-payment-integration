import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit.entity';

export interface AuditLogData {
  userId?: number;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async log(data: AuditLogData): Promise<void> {
    const auditLog = this.auditLogs.create({
      user_id: data.userId,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      metadata: data.metadata ? this.sanitizeMetadata(data.metadata) : null,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
    });

    await this.auditLogs.save(auditLog);
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'password_hash',
      'token',
      'refresh_token',
      'access_token',
      'accountNumber',
      'account_number',
      'routingNumber',
      'routing_number',
      'ssn',
      'social_security_number',
    ];

    const redactValue = (obj: any, key: string): any => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        return '[REDACTED]';
      }
      return obj[key];
    };

    const redactObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(redactObject);
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = redactValue(obj, key);
        if (typeof result[key] === 'object' && result[key] !== null) {
          result[key] = redactObject(result[key]);
        }
      }
      return result;
    };

    return redactObject(sanitized);
  }

  async getAuditLogs(options: {
    userId?: number;
    action?: AuditAction;
    resourceType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditLog[]> {
    const query = this.auditLogs.createQueryBuilder('audit');

    if (options.userId) {
      query.andWhere('audit.user_id = :userId', { userId: options.userId });
    }

    if (options.action) {
      query.andWhere('audit.action = :action', { action: options.action });
    }

    if (options.resourceType) {
      query.andWhere('audit.resource_type = :resourceType', { resourceType: options.resourceType });
    }

    query.orderBy('audit.created_time', 'DESC');

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.offset) {
      query.offset(options.offset);
    }

    return query.getMany();
  }
}
