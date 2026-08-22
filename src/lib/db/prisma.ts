import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { getEnv } from '@/lib/env'

/**
 * Two connections, on purpose:
 *
 * `appDb`    - runs as a role WITHOUT BYPASSRLS. Every tenant query goes
 *              through it, wrapped by `withTenant()`, so PostgreSQL RLS is the
 *              last line of defence against cross-tenant reads.
 *
 * `adminDb`  - runs as the schema owner. Reserved for operations that legally
 *              have no tenant context: credential lookup during login, billing
 *              webhooks, the platform admin panel and the seed script.
 */

declare global {
  var __bellaAppDb: PrismaClient | undefined
  var __bellaAdminDb: PrismaClient | undefined
}

function createClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export function getAppDb(): PrismaClient {
  if (!globalThis.__bellaAppDb) {
    globalThis.__bellaAppDb = createClient(getEnv().DATABASE_URL)
  }
  return globalThis.__bellaAppDb
}

export function getAdminDb(): PrismaClient {
  if (!globalThis.__bellaAdminDb) {
    const env = getEnv()
    globalThis.__bellaAdminDb = createClient(
      env.DIRECT_DATABASE_URL ?? env.DATABASE_URL,
    )
  }
  return globalThis.__bellaAdminDb
}

/** Transaction client handed to tenant-scoped callbacks. */
export type TenantClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid ${label}: expected a UUID`)
  }
}

export interface DbContext {
  tenantId?: string | null
  userId?: string | null
}

/**
 * Opens a transaction, pins the RLS context to it (`set_config(..., true)` is
 * transaction-local) and runs `fn`. Everything the callback reads or writes is
 * filtered by the tenant policies.
 */
export async function withContext<T>(
  context: DbContext,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  const { tenantId, userId } = context
  if (tenantId) assertUuid(tenantId, 'tenantId')
  if (userId) assertUuid(userId, 'userId')

  return getAppDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId ?? ''}, true)`
    await tx.$queryRaw`SELECT set_config('app.current_user_id', ${userId ?? ''}, true)`
    return fn(tx as TenantClient)
  })
}

/** Runs `fn` scoped to a single tenant (the common case). */
export function withTenant<T>(
  tenantId: string,
  fn: (tx: TenantClient) => Promise<T>,
  userId?: string | null,
): Promise<T> {
  return withContext({ tenantId, userId: userId ?? null }, fn)
}

/**
 * Runs `fn` with only a user context — used before a tenant is chosen
 * (listing the salons a user belongs to, accepting an invitation).
 */
export function withUser<T>(
  userId: string,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  return withContext({ tenantId: null, userId }, fn)
}

export async function disconnectDb(): Promise<void> {
  await globalThis.__bellaAppDb?.$disconnect()
  await globalThis.__bellaAdminDb?.$disconnect()
  globalThis.__bellaAppDb = undefined
  globalThis.__bellaAdminDb = undefined
}
