import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { MemberRole, TenantStatus } from '@/generated/prisma/enums'
import { getAdminDb } from '@/lib/db'
import { forbidden, unauthenticated } from '@/lib/errors'
import { permissionsFor, type Permission } from '@/lib/rbac'
import { hashToken } from './tokens'
import { readActiveTenantCookie, readSessionCookie } from './cookies'

export interface SessionUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  emailVerifiedAt: Date | null
  isPlatformAdmin: boolean
}

export interface TenantSummary {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  status: TenantStatus
  trialEndsAt: Date | null
  timezone: string
  currency: string
  onboardingCompletedAt: Date | null
  onboardingStep: number
  planCode: string | null
}

export interface AuthContext {
  user: SessionUser
  sessionId: string
  memberships: Array<{
    tenantId: string
    tenantName: string
    tenantSlug: string
    role: MemberRole
  }>
  tenant: TenantSummary | null
  role: MemberRole | null
  membershipId: string | null
  professionalId: string | null
  branchId: string | null
  permissions: Set<Permission>
}

/** Resolved once per request. */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const token = await readSessionCookie()
  if (!token) return null

  const db = getAdminDb()
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      activeTenantId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          emailVerifiedAt: true,
          isPlatformAdmin: true,
          deletedAt: true,
        },
      },
    },
  })

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt < new Date() ||
    session.user.deletedAt
  ) {
    return null
  }

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id, status: 'ACTIVE' },
    select: {
      id: true,
      tenantId: true,
      role: true,
      branchId: true,
      professionalId: true,
      overrides: { select: { permissionCode: true, allow: true } },
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          status: true,
          trialEndsAt: true,
          timezone: true,
          currency: true,
          onboardingCompletedAt: true,
          onboardingStep: true,
          deletedAt: true,
          subscription: { select: { plan: { select: { code: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const available = memberships.filter((membership) => !membership.tenant.deletedAt)

  const cookieTenantId = await readActiveTenantCookie()
  const active =
    available.find((membership) => membership.tenantId === cookieTenantId) ??
    available.find((membership) => membership.tenantId === session.activeTenantId) ??
    available[0] ??
    null

  const user: SessionUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    avatarUrl: session.user.avatarUrl,
    emailVerifiedAt: session.user.emailVerifiedAt,
    isPlatformAdmin: session.user.isPlatformAdmin,
  }

  return {
    user,
    sessionId: session.id,
    memberships: available.map((membership) => ({
      tenantId: membership.tenantId,
      tenantName: membership.tenant.name,
      tenantSlug: membership.tenant.slug,
      role: membership.role,
    })),
    tenant: active
      ? {
          id: active.tenant.id,
          name: active.tenant.name,
          slug: active.tenant.slug,
          logoUrl: active.tenant.logoUrl,
          status: active.tenant.status,
          trialEndsAt: active.tenant.trialEndsAt,
          timezone: active.tenant.timezone,
          currency: active.tenant.currency,
          onboardingCompletedAt: active.tenant.onboardingCompletedAt,
          onboardingStep: active.tenant.onboardingStep,
          planCode: active.tenant.subscription?.plan.code ?? null,
        }
      : null,
    role: active?.role ?? null,
    membershipId: active?.id ?? null,
    professionalId: active?.professionalId ?? null,
    branchId: active?.branchId ?? null,
    permissions: active
      ? permissionsFor({
          role: active.role,
          overrides: Object.fromEntries(
            active.overrides.map((override) => [
              override.permissionCode,
              override.allow,
            ]),
          ),
        })
      : new Set<Permission>(),
  }
})

export interface TenantContext extends AuthContext {
  tenant: TenantSummary
  role: MemberRole
  membershipId: string
}

/** Server components / actions: user must be signed in. */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext()
  if (!context) redirect('/entrar')
  return context
}

/** Server components / actions: user must be signed in AND inside a salon. */
export async function requireTenant(): Promise<TenantContext> {
  const context = await requireAuth()
  if (!context.tenant || !context.role || !context.membershipId) {
    redirect('/onboarding')
  }
  return context as TenantContext
}

export async function requirePermission(
  permission: Permission,
): Promise<TenantContext> {
  const context = await requireTenant()
  if (!context.permissions.has(permission)) {
    redirect('/sem-permissao')
  }
  return context
}

export async function requireAnyPermission(
  permissions: readonly Permission[],
): Promise<TenantContext> {
  const context = await requireTenant()
  const allowed = permissions.some((permission) =>
    context.permissions.has(permission),
  )
  if (!allowed) redirect('/sem-permissao')
  return context
}

/** API routes and server actions: signal the failure instead of redirecting. */
export function assertPermission(
  context: Pick<AuthContext, 'permissions'>,
  permission: Permission,
): void {
  if (!context.permissions.has(permission)) throw forbidden()
}

/** Same as `requireAuth`, but throws instead of redirecting (API routes). */
export async function requireAuthOrThrow(): Promise<AuthContext> {
  const context = await getAuthContext()
  if (!context) throw unauthenticated()
  return context
}

export function hasPermission(
  context: Pick<AuthContext, 'permissions'>,
  permission: Permission,
): boolean {
  return context.permissions.has(permission)
}
