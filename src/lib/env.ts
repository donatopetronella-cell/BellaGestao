import { z } from 'zod'

/**
 * Environment contract. Fails fast at boot instead of producing confusing
 * runtime errors deep inside a request.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must have at least 32 characters'),

  // Optional integrations, wired in later phases.
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('client-photos'),
  OPENAI_API_KEY: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
})

export type Env = z.infer<typeof schema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  cached = parsed.data
  return cached
}

/** Test helper: forget the memoised environment. */
export function resetEnvCache(): void {
  cached = null
}
