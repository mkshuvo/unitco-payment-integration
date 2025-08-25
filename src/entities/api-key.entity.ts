import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('api_keys')
@Index(['fingerprint'], { unique: true })
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  // Base64 string produced by CryptoService.encryptField (iv+tag+ciphertext)
  @Column({ type: 'text' })
  encrypted_secret: string;

  // First 12 hex of SHA-256 of plaintext secret (used for uniqueness)
  @Column({ type: 'varchar', length: 12 })
  fingerprint: string;

  // Masked representation of the secret (e.g., ****123456)
  @Column({ type: 'varchar', length: 20 })
  mask: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_active: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_time: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_time?: Date | null;
}
