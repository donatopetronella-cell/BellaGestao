import { describe, expect, it } from 'vitest'
import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  can,
  canAll,
  canAny,
  assertCan,
  permissionsFor,
  ownScopeProfessionalId,
} from '@/lib/rbac'

describe('RBAC', () => {
  it('proprietário recebe todas as permissões', () => {
    expect(ROLE_PERMISSIONS.OWNER).toHaveLength(ALL_PERMISSIONS.length)
    for (const permission of ALL_PERMISSIONS) {
      expect(can({ role: 'OWNER' }, permission)).toBe(true)
    }
  })

  it('gerente tem acesso administrativo, mas não altera a assinatura', () => {
    expect(can({ role: 'MANAGER' }, 'settings.manage')).toBe(true)
    expect(can({ role: 'MANAGER' }, 'billing.manage')).toBe(false)
  })

  it('recepcionista cuida da agenda e do caixa, sem financeiro', () => {
    expect(
      canAll({ role: 'RECEPTIONIST' }, [
        'agenda.create',
        'agenda.cancel',
        'clients.create',
        'cash.open',
      ]),
    ).toBe(true)
    expect(can({ role: 'RECEPTIONIST' }, 'finance.view')).toBe(false)
    expect(can({ role: 'RECEPTIONIST' }, 'commissions.manage')).toBe(false)
  })

  it('profissional vê apenas a própria agenda e as próprias comissões', () => {
    expect(can({ role: 'PROFESSIONAL' }, 'agenda.view')).toBe(false)
    expect(can({ role: 'PROFESSIONAL' }, 'agenda.view_own')).toBe(true)
    expect(can({ role: 'PROFESSIONAL' }, 'commissions.view')).toBe(false)
    expect(can({ role: 'PROFESSIONAL' }, 'commissions.view_own')).toBe(true)
    expect(can({ role: 'PROFESSIONAL' }, 'finance.view')).toBe(false)
  })

  it('financeiro enxerga caixa e relatórios, mas não gerencia a equipe', () => {
    expect(canAny({ role: 'FINANCE' }, ['finance.manage', 'reports.export'])).toBe(true)
    expect(can({ role: 'FINANCE' }, 'team.manage')).toBe(false)
    expect(can({ role: 'FINANCE' }, 'agenda.create')).toBe(false)
  })

  it('overrides por membro adicionam e removem permissões', () => {
    const subject = {
      role: 'RECEPTIONIST' as const,
      overrides: { 'finance.view': true, 'cash.move': false },
    }
    expect(can(subject, 'finance.view')).toBe(true)
    expect(can(subject, 'cash.move')).toBe(false)
    expect(permissionsFor(subject).has('agenda.create')).toBe(true)
  })

  it('overrides desconhecidos são ignorados', () => {
    const subject = { role: 'FINANCE' as const, overrides: { 'nao.existe': true } }
    expect(permissionsFor(subject).has('finance.view')).toBe(true)
  })

  it('assertCan lança erro com mensagem amigável', () => {
    expect(() => assertCan({ role: 'PROFESSIONAL' }, 'finance.view')).toThrow(
      /não tem acesso/i,
    )
    expect(() => assertCan({ role: 'OWNER' }, 'finance.view')).not.toThrow()
  })

  it('profissional é restringido ao próprio id nas consultas', () => {
    expect(
      ownScopeProfessionalId(
        { role: 'PROFESSIONAL', professionalId: 'prof-1' },
        'agenda.view',
      ),
    ).toBe('prof-1')
    expect(
      ownScopeProfessionalId(
        { role: 'MANAGER', professionalId: 'prof-1' },
        'agenda.view',
      ),
    ).toBeNull()
  })
})
