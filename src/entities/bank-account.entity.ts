import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BankBranch } from './bank-branch.entity';

@Entity('bank_account')
export class BankAccount {
  @PrimaryGeneratedColumn()
  account_id: number;

  @Column({ type: 'int', unsigned: true })
  user_id: number;

  @Column({ type: 'int', unsigned: true })
  branch_id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  encrypted_account_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  encrypted_account_holder_name: string;

  @Column({ type: 'varchar', length: 34, nullable: true })
  encrypted_iban: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  encrypted_swift_code: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  encrypted_sort_code: string;

  @Column({ type: 'tinyint', default: 0 })
  encrypted: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  address1: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  address2: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  zip: string;

  @Column({ type: 'varchar', length: 2, default: 'US' })
  country: string;

  // New Unit-specific columns
  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  unit_counterparty_id: string;

  @Column({ 
    type: 'enum', 
    enum: ['PENDING', 'ACTIVE', 'REJECTED'], 
    default: 'PENDING' 
  })
  unit_counterparty_status: 'PENDING' | 'ACTIVE' | 'REJECTED';

  @Column({ type: 'varchar', length: 8, nullable: true })
  mask: string;

  @Column({ type: 'tinyint', default: 0 })
  is_primary: number;

  @Column({ 
    type: 'enum', 
    enum: ['ACTIVE', 'INACTIVE'], 
    default: 'ACTIVE' 
  })
  status: 'ACTIVE' | 'INACTIVE';

  @Column({ 
    type: 'enum', 
    enum: ['ACH', 'WIRE'], 
    default: 'ACH' 
  })
  method: 'ACH' | 'WIRE';

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'int', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;

  @Column({ type: 'int', unsigned: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_time: Date;

  // Relationships
  @ManyToOne(() => BankBranch, branch => branch.bankAccounts)
  @JoinColumn({ name: 'branch_id' })
  branch: BankBranch;
}
