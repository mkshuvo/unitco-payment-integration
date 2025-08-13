import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Database
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASS: z.string().min(0),
  DB_NAME: z.string().min(1),

  // Redis
  REDIS_URL: z.string().url(),

  // Optional but planned variables
  ENCRYPTION_KEY: z.string().min(0).optional(),
  UNIT_API_KEY: z.string().min(0).optional(),
  UNIT_WEBHOOK_SECRET: z.string().min(0).optional(),
  JWT_ACCESS_SECRET: z.string().min(0).optional(),
  JWT_REFRESH_SECRET: z.string().min(0).optional(),
  CRON_TZ: z.string().min(0).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return parsed.data;
}
