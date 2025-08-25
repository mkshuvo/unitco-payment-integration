import { UnitService } from './unit.service';

// Minimal stubs for dependencies
class ConfigStub {
  constructor(private values: Record<string, any> = {}) {}
  get<T = any>(key: string): T | undefined {
    return this.values[key] as T;
  }
}

class ApiKeysStub {
  constructor(private key: string | null = 'test_api_key') {}
  async getActivePlaintext(): Promise<string> {
    if (!this.key) throw new Error('no active key');
    return this.key;
  }
}

describe('UnitService.createApplicationForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates application form and returns id+token', async () => {
    const cfg = new ConfigStub({
      UNIT_BASE_URL: 'https://api.s.unit.sh',
      UNIT_API_KEY: '',
    }) as any;
    const apiKeys = new ApiKeysStub('test_api_key') as any;
    const service = new UnitService(cfg, apiKeys);

    const body = {
      data: {
        id: 'af_123',
        attributes: {
          applicationFormToken: {
            token: 'tok_123',
            expiration: '2099-01-01T00:00:00Z',
          },
        },
      },
    };

    const res = { ok: true, json: async () => body } as any;

    const fetchSpy = jest.spyOn(global as any, 'fetch').mockResolvedValue(res);

    const out = await service.createApplicationForm({ tags: { foo: 'bar' } });
    expect(out).toEqual({
      id: 'af_123',
      token: 'tok_123',
      expiration: '2099-01-01T00:00:00Z',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, initUnknown] = fetchSpy.mock.calls[0];
    const init = initUnknown as any;
    expect(url).toBe('https://api.s.unit.sh/application-forms');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer test_api_key');
    expect(init.headers['Accept']).toBe('application/vnd.api+json');
    expect(init.headers['Content-Type']).toBe('application/vnd.api+json');
  });

  it('throws on non-ok response', async () => {
    const cfg = new ConfigStub({
      UNIT_BASE_URL: 'https://api.s.unit.sh',
      UNIT_API_KEY: '',
    }) as any;
    const apiKeys = new ApiKeysStub('test_api_key') as any;
    const service = new UnitService(cfg, apiKeys);

    const res = {
      ok: false,
      status: 401,
      json: async () => ({
        errors: [{ status: '401', title: 'Unauthorized' }],
      }),
    } as any;
    jest.spyOn(global as any, 'fetch').mockResolvedValue(res);

    await expect(service.createApplicationForm()).rejects.toThrow(
      'Failed to create Application Form',
    );
  });

  it('throws when no API key is configured', async () => {
    const cfg = new ConfigStub({
      UNIT_BASE_URL: 'https://api.s.unit.sh',
      UNIT_API_KEY: '',
    }) as any;
    const apiKeys = new ApiKeysStub(null) as any;
    const service = new UnitService(cfg, apiKeys);

    await expect(service.createApplicationForm()).rejects.toThrow(
      'No active Unit API key configured',
    );
  });
});
