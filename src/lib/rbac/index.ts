import type { MemberRole } from '@/generated/prisma/enums'
import { forbidden } from '@/lib/errors'
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type Permission,
} from './permissions'

export { ALL_PERMISSIONS, PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS }
export type { Permission }

export interface AccessSubject {
  role: MemberRole
  /** Per-member exceptions stored in `member_permission_overrides`. */
  overrides?: Record<string, boolean>
}

/** Effective permission set for a member (role matrix + overrides). */
export function permissionsFor(subject: AccessSubject): Set<Permission> {
  const result = new Set<Permission>(ROLE_PERMISSIONS[subject.role])
  for (const [code, allow] of Object.entries(subject.overrides ?? {})) {
    if (!isPermission(code)) continue
    if (allow) result.add(code)
    else result.delete(code)
  }
  return result
}

export function isPermission(value: string): value is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value)
}

export function can(subject: AccessSubject, permission: Permission): boolean {
  return permissionsFor(subject).has(permission)
}

export function canAny(
  subject: AccessSubject,
  permissions: readonly Permission[],
): boolean {
  const effective = permissionsFor(subject)
  return permissions.some((permission) => effective.has(permission))
}

export function canAll(
  subject: AccessSubject,
  permissions: readonly Permission[],
): boolean {
  const effective = permissionsFor(subject)
  return permissions.every((permission) => effective.has(permission))
}

export function assertCan(
  subject: AccessSubject,
  permission: Permission,
): void {
  if (!can(subject, permission)) {
    throw forbidden(
      `Seu perfil (${ROLE_LABELS[subject.role]}) não tem acesso a este recurso.`,
    )
  }
}

/**
 * A professional only ever sees their own agenda/commissions. Returns the
 * professional id the query must be restricted to, or `null` for full access.
 */
export function ownScopeProfessionalId(
  subject: AccessSubject & { professionalId?: string | null },
  fullAccessPermission: Permission,
): string | null {
  if (can(subject, fullAccessPermission)) return null
  return subject.professionalId ?? null
}
