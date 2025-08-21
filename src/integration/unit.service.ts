import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { Unit } from '@unit-finance/unit-node-sdk';
import type { UnitError } from '@unit-finance/unit-node-sdk';

export interface UnitStatusView {
  status: 'UP' | 'DOWN';
  checkedAt: string; // ISO
  responseTimeMs: number;
  target: string;
  reason?: string;
}

@Injectable()
export class UnitService {
  private readonly logger = new Logger(UnitService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly apiKeys: ApiKeysService,
  ) {}

  async checkStatus(): Promise<UnitStatusView> {
    const baseUrl = this.config.get<string>('UNIT_BASE_URL') || 'https://api.s.unit.sh';
    const target = `${baseUrl} [UnitSDK customers.list(limit=1)]`;

    const start = Date.now();
    let key: string | null = null;
    try {
      key = await this.apiKeys.getActivePlaintext();
    } catch (err: any) {
      // If DB lookup failed, try env fallback before declaring DOWN
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) {
        this.logger.warn('DB key lookup failed; using UNIT_API_KEY from environment as fallback.');
        key = envKey;
      } else {
        const elapsed = Date.now() - start;
        const reason = 'Failed to load active API key';
        this.logger.error(`${reason}: ${err?.message || err}`);
        return {
          status: 'DOWN',
          checkedAt: new Date().toISOString(),
          responseTimeMs: elapsed,
          target,
          reason,
        };
      }
    }

    // Fallback to environment variable if no active DB key
    if (!key) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) {
        this.logger.warn('Using UNIT_API_KEY from environment as fallback (no active DB key).');
        key = envKey;
      }
    }

    if (!key) {
      return {
        status: 'DOWN',
        checkedAt: new Date().toISOString(),
        responseTimeMs: 0,
        target,
        reason: 'No active API key',
      };
    }

    try {
      const unit = new Unit(key, baseUrl);

      const timeoutMs = 5000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout after 5s')), timeoutMs),
      );

      await Promise.race([
        unit.customers.list({ limit: 1 }),
        timeoutPromise,
      ]);

      const elapsed = Date.now() - start;
      return {
        status: 'UP',
        checkedAt: new Date().toISOString(),
        responseTimeMs: elapsed,
        target,
      };
    } catch (err: any) {
      const elapsed = Date.now() - start;
      let reason: string = err?.message || 'Unknown error';
      if (err?.isUnitError) {
        const ue = err as UnitError;
        const first = ue.errors && ue.errors[0];
        reason = first
          ? `HTTP ${first.status} ${first.title}${first.code ? ` (${first.code})` : ''}`
          : ue.message;
      }
      this.logger.error(`Unit status error: ${reason}`);
      return {
        status: 'DOWN',
        checkedAt: new Date().toISOString(),
        responseTimeMs: elapsed,
        target,
        reason,
      };
    }
  }
}
