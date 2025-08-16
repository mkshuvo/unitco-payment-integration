import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PayoutBatch } from './payout-batch.entity';

@Entity('payout_item')
export class PayoutItem {
  @PrimaryGeneratedColumn()
  item_id: number;

  @Column({ type: 'int', unsigned: true })
  batch_id: number;

  @Column({ type: 'int', unsigned: true })
  user_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 128 })
  reference_id: string;

  @Column({ 
    type: 'enum', 
    enum: ['PENDING', 'SUBMITTED', 'COMPLETED', 'FAILED'], 
    default: 'PENDING' 
  })
  status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';

  @Column({ type: 'varchar', length: 128, nullable: true })
  unit_payment_id: string;

  @Column({ type: 'int', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;

  @Column({ type: 'int', unsigned: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_time: Date;

  // Relationships
  @ManyToOne(() => PayoutBatch, batch => batch.items)
  @JoinColumn({ name: 'batch_id' })
  batch: PayoutBatch;
}
