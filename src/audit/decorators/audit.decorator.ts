import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../audit.entity';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  action: AuditAction;
  resourceType?: string;
  resourceIdParam?: string; // Parameter name to extract resource ID from
}

export const Audit = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_KEY, metadata);
