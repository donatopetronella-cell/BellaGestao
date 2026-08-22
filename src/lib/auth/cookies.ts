import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'bella_session'
export const ACTIVE_TENANT_COOKIE = 'bella_tenant'

const isProduction = () => process.env.NODE_ENV === 'production'

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    expires: expiresAt,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  store.delete(ACTIVE_TENANT_COOKIE)
}

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

export async function setActiveTenantCookie(tenantId: string): Promise<void> {
  const store = await cookies()
  store.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function readActiveTenantCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(ACTIVE_TENANT_COOKIE)?.value ?? null
}
