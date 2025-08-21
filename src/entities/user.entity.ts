import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  // Argon2id hash
  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  full_name?: string | null;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  is_active: number;

  @Column({ type: 'timestamp', nullable: true, default: null })
  last_login_time?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_time: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_time?: Date | null;
}
