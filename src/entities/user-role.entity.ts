import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('user_roles')
@Unique('UQ_user_role', ['user_id', 'role_id'])
@Index('IDX_role_user', ['role_id', 'user_id'])
export class UserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unsigned: true })
  user_id: number;

  @Column({ type: 'int', unsigned: true })
  role_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_time: Date;
}
