import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_REGISTER'
  | 'USER_UPDATE'
  | 'BANK_ACCOUNT_ADD'
  | 'BANK_ACCOUNT_UPDATE'
  | 'PAYMENT_CREATE'
  | 'PAYMENT_APPROVE'
  | 'ROLE_ASSIGN'
  | 'ROLE_REVOKE'
  | 'UNIT_STATUS_CHECK'
  | 'APPLICATION_FORM_CREATE'
  | 'CUSTOMER_RESOLVE'
  | 'CUSTOMER_TOKEN_CREATE';

@Entity('audit_logs')
@Index(['user_id', 'created_time'])
@Index(['action', 'created_time'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  user_id?: number | null;

  @Column({
    type: 'enum',
    enum: [
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_REGISTER',
      'USER_UPDATE',
      'BANK_ACCOUNT_ADD',
      'BANK_ACCOUNT_UPDATE',
      'PAYMENT_CREATE',
      'PAYMENT_APPROVE',
      'ROLE_ASSIGN',
      'ROLE_REVOKE',
      'UNIT_STATUS_CHECK',
      'APPLICATION_FORM_CREATE',
      'CUSTOMER_RESOLVE',
      'CUSTOMER_TOKEN_CREATE',
    ],
  })
  action: AuditAction;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resource_type?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resource_id?: string | null;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;
}
