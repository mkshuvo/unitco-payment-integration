import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { Unit } from '@unit-finance/unit-node-sdk';
import type { UnitError } from '@unit-finance/unit-node-sdk';
import { randomUUID } from 'crypto';

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
    const baseUrl =
      this.config.get<string>('UNIT_BASE_URL') || 'https://api.s.unit.sh';
    const target = `${baseUrl} [UnitSDK customers.list(limit=1)]`;

    const start = Date.now();
    let key: string | null = null;
    try {
      key = await this.apiKeys.getActivePlaintext();
    } catch (err: any) {
      // If DB lookup failed, try env fallback before declaring DOWN
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) {
        this.logger.warn(
          'DB key lookup failed; using UNIT_API_KEY from environment as fallback.',
        );
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

      // continue with checkStatus logic below
    }

    // Fallback to environment variable if no active DB key
    if (!key) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) {
        this.logger.warn(
          'Using UNIT_API_KEY from environment as fallback (no active DB key).',
        );
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

      await Promise.race([unit.customers.list({ limit: 1 }), timeoutPromise]);

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

  /**
   * Create a Unit Application Form (Sandbox) and return its id and applicationFormToken.
   * Uses direct HTTP call to Unit API as per docs.
   */
  async createApplicationForm(params?: {
    tags?: Record<string, string>;
    whiteLabelThemeId?: string;
  }): Promise<{ id: string; token: string; expiration?: string }> {
    const baseUrl =
      this.config.get<string>('UNIT_BASE_URL') || 'https://api.s.unit.sh';
    const endpoint = `${baseUrl}/application-forms`;

    // Resolve API key (reuse logic similar to checkStatus)
    let apiKey: string | null = null;
    try {
      apiKey = await this.apiKeys.getActivePlaintext();
    } catch (err: any) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) {
        this.logger.warn(
          'DB key lookup failed; using UNIT_API_KEY from environment as fallback.',
        );
        apiKey = envKey;
      }
    }
    if (!apiKey) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) apiKey = envKey;
    }
    if (!apiKey) {
      throw new Error('No active Unit API key configured');
    }

    const idempotencyKey = randomUUID();
    const body: any = {
      data: {
        type: 'applicationForm',
        attributes: {
          idempotencyKey,
          ...(params?.tags ? { tags: params.tags } : {}),
        },
      },
    };
    if (params?.whiteLabelThemeId) {
      body.data.relationships = {
        whiteLabelTheme: {
          data: { type: 'whiteLabelTheme', id: params.whiteLabelThemeId },
        },
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'X-Accept-Version': 'V2024_06',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        const first = j?.errors?.[0];
        if (first) {
          detail = `HTTP ${first.status} ${first.title}${first.code ? ` (${first.code})` : ''}`;
        }
      } catch {
        /* ignore parse error */
      }
      this.logger.error(
        `Unit createApplicationForm failed: ${detail}; idempotencyKey=${idempotencyKey}`,
      );
      throw new Error('Failed to create Application Form');
    }

    const json = await res.json();
    const id: string = json?.data?.id;
    const token: string | undefined =
      json?.data?.attributes?.applicationFormToken?.token;
    const expiration: string | undefined =
      json?.data?.attributes?.applicationFormToken?.expiration;
    if (!id || !token) {
      this.logger.error(
        `Invalid Unit response (missing id/token); idPresent=${!!id}; tokenPresent=${!!token}; idempotencyKey=${idempotencyKey}`,
      );
      throw new Error(
        'Invalid response from Unit when creating Application Form',
      );
    }
    return { id, token, expiration };
  }

  /**
   * Resolve a Unit customer id by email address using full-text search and exact match on attributes.email
   * Returns the most recently created match (sorted by -createdAt) or null if none.
   */
  async resolveCustomerIdByEmail(email: string): Promise<string | null> {
    const baseUrl =
      this.config.get<string>('UNIT_BASE_URL') || 'https://api.s.unit.sh';

    // Resolve API key
    let apiKey: string | null = null;
    try {
      apiKey = await this.apiKeys.getActivePlaintext();
    } catch (err: any) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) apiKey = envKey;
    }
    if (!apiKey) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) apiKey = envKey;
    }
    if (!apiKey) throw new Error('No active Unit API key configured');

    const url = `${baseUrl}/customers?page[limit]=1&sort=-createdAt&search=${encodeURIComponent(
      email,
    )}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/vnd.api+json',
          'X-Accept-Version': 'V2024_06',
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.error(`Unit customers.list failed: HTTP ${res.status}`);
        return null;
      }
      const json = await res.json();
      const items: any[] = Array.isArray(json?.data) ? json.data : [];
      for (const item of items) {
        const itemEmail: string | undefined = item?.attributes?.email;
        if (itemEmail && itemEmail.toLowerCase() === email.toLowerCase()) {
          return item.id as string;
        }
      }
      return null;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        this.logger.error('Unit customers.list timeout after 5s');
        return null;
      }
      this.logger.error(`Unit customers.list error: ${err?.message || err}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Initiate a customer token verification (2FA) challenge.
   * Returns verificationToken on success.
   */
  async createCustomerTokenVerification(params: {
    customerId: string;
    channel: 'sms' | 'call';
    phone?: { countryCode: string; number: string };
    locale?: string; // optional localization header like 'en', 'es', etc.
  }): Promise<{ verificationToken: string }> {
    const baseUrl =
      this.config.get<string>('UNIT_BASE_URL') || 'https://api.s.unit.sh';

    // Resolve API key
    let apiKey: string | null = null;
    try {
      apiKey = await this.apiKeys.getActivePlaintext();
    } catch (err: any) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) apiKey = envKey;
    }
    if (!apiKey) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) apiKey = envKey;
    }
    if (!apiKey) throw new Error('No active Unit API key configured');

    const endpoint = `${baseUrl}/customers/${encodeURIComponent(
      params.customerId,
    )}/token/verification`;

    const body: any = {
      data: {
        type: 'customerTokenVerification',
        attributes: {
          channel: params.channel,
          ...(params.phone ? { phone: params.phone } : {}),
        },
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'X-Accept-Version': 'V2024_06',
    };
    if (params.locale) headers['Accept-Language'] = params.locale;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          const first = j?.errors?.[0];
          if (first) {
            detail = `HTTP ${first.status} ${first.title}${first.code ? ` (${first.code})` : ''}`;
          }
        } catch {}
        this.logger.error(
          `Unit createCustomerTokenVerification failed: ${detail}`,
        );
        throw new Error('Failed to create customer token verification');
      }
      const json = await res.json();
      const verificationToken: string | undefined =
        json?.data?.attributes?.verificationToken;
      if (!verificationToken) {
        this.logger.error(
          'Unit verification: missing verificationToken in response',
        );
        throw new Error('Invalid verification response from Unit');
      }
      return { verificationToken };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        this.logger.error('Unit token verification timeout after 5s');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Create a customer bearer token. Supports either 2FA verificationToken+verificationCode or JWT-based flow.
   */
  async createCustomerToken(params: {
    customerId: string;
    scope: string;
    verificationToken?: string;
    verificationCode?: string;
    jwtToken?: string;
    expiresIn?: number; // seconds, default 86400
  }): Promise<{ token: string; expiresIn: number }> {
    const baseUrl =
      this.config.get<string>('UNIT_BASE_URL') || 'https://api.s.unit.sh';

    // Resolve API key
    let apiKey: string | null = null;
    try {
      apiKey = await this.apiKeys.getActivePlaintext();
    } catch (err: any) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) apiKey = envKey;
    }
    if (!apiKey) {
      const envKey = (this.config.get<string>('UNIT_API_KEY') || '').trim();
      if (envKey) apiKey = envKey;
    }
    if (!apiKey) throw new Error('No active Unit API key configured');

    const endpoint = `${baseUrl}/customers/${encodeURIComponent(
      params.customerId,
    )}/token`;

    const attributes: any = {
      scope: params.scope,
      ...(params.expiresIn ? { expiresIn: params.expiresIn } : {}),
    };
    if (params.jwtToken) {
      attributes.jwtToken = params.jwtToken;
    } else if (params.verificationToken && params.verificationCode) {
      attributes.verificationToken = params.verificationToken;
      attributes.verificationCode = params.verificationCode;
    }

    const body = {
      data: {
        type: 'customerToken',
        attributes,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'X-Accept-Version': 'V2024_06',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          const first = j?.errors?.[0];
          if (first) {
            detail = `HTTP ${first.status} ${first.title}${first.code ? ` (${first.code})` : ''}`;
          }
        } catch {}
        this.logger.error(`Unit createCustomerToken failed: ${detail}`);
        throw new Error('Failed to create customer token');
      }
      const json = await res.json();
      const token: string | undefined = json?.data?.attributes?.token;
      const expiresIn: number | undefined = json?.data?.attributes?.expiresIn;
      if (!token) {
        this.logger.error('Unit token: missing token in response');
        throw new Error('Invalid token response from Unit');
      }
      return {
        token,
        expiresIn: typeof expiresIn === 'number' ? expiresIn : 86400,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        this.logger.error('Unit createCustomerToken timeout after 5s');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
