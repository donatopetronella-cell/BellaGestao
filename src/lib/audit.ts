import 'server-only'
import { headers } from 'next/headers'
import { withTenant } from '@/lib/db'

export interface AuditInput {
  tenantId: string
  userId?: string | null
  userName?: string | null
  action: string
  entity: string
  entityId?: string | null
  summary?: string | null
  changes?: Record<string, unknown>
}

export async function requestMeta(): Promise<{
  ip: string | null
  userAgent: string | null
}> {
  const headerList = await headers()
  const forwarded = headerList.get('x-forwarded-for')
  return {
    ip: forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? null,
    userAgent: headerList.get('user-agent'),
  }
}

/**
 * Records an important action. Auditing must never break the operation that
 * triggered it, so failures are logged and swallowed.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    const meta = await requestMeta()
    await withTenant(
      input.tenantId,
      (tx) =>
        tx.auditLog.create({
          data: {
            tenantId: input.tenantId,
            userId: input.userId ?? null,
            userName: input.userName ?? null,
            action: input.action,
            entity: input.entity,
            entityId: input.entityId ?? null,
            summary: input.summary ?? null,
            changes: (input.changes ?? {}) as never,
            ip: meta.ip,
            userAgent: meta.userAgent,
          },
        }),
      input.userId ?? null,
    )
  } catch (error) {
    console.error('[bellagestao] failed to write audit log', error)
  }
}
