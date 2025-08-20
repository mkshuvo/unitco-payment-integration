import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { CryptoService } from '../crypto/crypto.service';
import { createHash } from 'crypto';

export interface ApiKeyView {
  id: string;
  name: string;
  mask: string;
  fingerprint: string; // first 12 hex chars
  isActive: boolean;
  createdTime: Date;
  updatedTime: Date;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
    private readonly dataSource: DataSource,
    private readonly crypto: CryptoService,
  ) {}

  private toView(entity: ApiKey): ApiKeyView {
    return {
      id: entity.id,
      name: entity.name,
      mask: entity.mask,
      fingerprint: entity.fingerprint,
      isActive: !!entity.is_active,
      createdTime: entity.created_time,
      updatedTime: entity.updated_time,
    };
  }

  private maskSecret(secret: string): string {
    const last = secret.slice(-6);
    return `****${last}`;
  }

  private fingerprint(secret: string): string {
    const full = createHash('sha256').update(secret, 'utf8').digest('hex');
    return full.slice(0, 12);
  }

  async create(dto: CreateApiKeyDto): Promise<ApiKeyView> {
    const encrypted = await this.crypto.encryptField(dto.secret);
    const mask = this.maskSecret(dto.secret);
    const fp = this.fingerprint(dto.secret);

    const entity = this.repo.create({
      name: dto.name,
      encrypted_secret: encrypted,
      mask,
      fingerprint: fp,
      is_active: 0,
    });

    try {
      const saved = await this.repo.save(entity);
      return this.toView(saved);
    } catch (e: any) {
      if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
        throw new ConflictException('API key already exists');
      }
      throw e;
    }
  }

  async list(limit = 20, offset = 0): Promise<{ items: ApiKeyView[]; total: number; limit: number; offset: number }> {
    const [rows, total] = await this.repo.findAndCount({
      take: Math.min(Math.max(limit, 1), 100),
      skip: Math.max(offset, 0),
      where: {},
      order: { created_time: 'DESC' },
      withDeleted: false,
    });
    return {
      items: rows.map(r => this.toView(r)),
      total,
      limit,
      offset,
    };
  }

  async get(id: string): Promise<ApiKeyView> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('API key not found');
    return this.toView(entity);
    
  }

  async update(id: string, dto: UpdateApiKeyDto): Promise<ApiKeyView> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('API key not found');

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.secret !== undefined) {
      const encrypted = await this.crypto.encryptField(dto.secret);
      const mask = this.maskSecret(dto.secret);
      const fp = this.fingerprint(dto.secret);
      entity.encrypted_secret = encrypted;
      entity.mask = mask;
      entity.fingerprint = fp;
    }

    try {
      const saved = await this.repo.save(entity);
      return this.toView(saved);
    } catch (e: any) {
      if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
        throw new ConflictException('API key already exists');
      }
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return; // idempotent
    await this.repo.softRemove(entity);
  }

  async activate(id: string): Promise<ApiKeyView> {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ApiKey);

      const target = await repo.findOne({ where: { id } });
      if (!target) throw new NotFoundException('API key not found');

      // Set all inactive
      await repo.createQueryBuilder()
        .update(ApiKey)
        .set({ is_active: 0 })
        .where('deleted_time IS NULL')
        .execute();

      // Activate target
      await repo.createQueryBuilder()
        .update(ApiKey)
        .set({ is_active: 1 })
        .where('id = :id', { id })
        .execute();

      const fresh = await repo.findOne({ where: { id } });
      return this.toView(fresh!);
    });
  }

  async getActivePlaintext(): Promise<string | null> {
    const active = await this.repo.findOne({ where: { is_active: 1 as any } });
    if (!active) return null;
    // Decrypt and return plaintext for runtime usage (never log)
    const plaintext = await this.crypto.decryptField(active.encrypted_secret);
    return plaintext;
  }
}
