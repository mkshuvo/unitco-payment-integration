import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PayoutItem } from './payout-item.entity';

@Entity('payout_batch')
export class PayoutBatch {
  @PrimaryGeneratedColumn()
  batch_id: number;

  @Column({ type: 'int', unsigned: true })
  user_id: number;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: 'int', unsigned: true })
  item_count: number;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string;

  @Column({ 
    type: 'enum', 
    enum: ['PENDING', 'SUBMITTED', 'COMPLETED', 'FAILED'], 
    default: 'PENDING' 
  })
  status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';

  @Column({ type: 'varchar', length: 128, unique: true })
  idempotency_key: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  unit_batch_id: string;

  @Column({ type: 'int', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;

  @Column({ type: 'int', unsigned: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_time: Date;

  // Relationships
  @OneToMany(() => PayoutItem, item => item.batch)
  items: PayoutItem[];
}
