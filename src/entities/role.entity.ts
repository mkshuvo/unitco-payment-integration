import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('roles')
@Index(['name'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description?: string | null;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_system: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_time: Date;
}
