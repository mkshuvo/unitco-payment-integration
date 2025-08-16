import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { BankAccount } from './bank-account.entity';

@Entity('bank_branch')
export class BankBranch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 11, nullable: true })
  swift: string;

  @Column({ type: 'varchar', length: 9, nullable: true })
  routing: string;

  @Column({ type: 'varchar', length: 100 })
  bank_name: string;

  @Column({ type: 'tinyint', default: 1 })
  reuse: number;

  @Column({ type: 'varchar', length: 2, default: 'US' })
  country: string;

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

  @Column({ type: 'int', unsigned: true })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;

  @Column({ type: 'int', unsigned: true })
  updated_by: number;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_time: Date;

  // Relationships
  @OneToMany(() => BankAccount, bankAccount => bankAccount.branch)
  bankAccounts: BankAccount[];
}
