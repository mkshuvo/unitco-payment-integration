import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type TokenType = 'REFRESH' | 'RESET';

@Entity('user_tokens')
@Index('IDX_user_revoked', ['user_id', 'is_revoked'])
@Index('IDX_expires', ['expires_time'])
export class UserToken {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  user_id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  token_hash: string;

  @Column({ type: 'enum', enum: ['REFRESH', 'RESET'], default: 'REFRESH' })
  type: TokenType;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_revoked: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  revoked_time?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expires_time?: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent?: string | null;
}
