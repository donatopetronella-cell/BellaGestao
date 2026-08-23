import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { archiveService, createService } from '@/features/services/service'
import { createProfessional } from '@/features/professionals/service'
import { createClient, getClient } from '@/features/clients/service'
import { AppError } from '@/lib/errors'
import { disconnectDb } from '@/lib/db'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

/**
 * The Phase 1 isolation test proved the database layer. These confirm the
 * Phase 2 domain services never leak a cross-tenant id back as "found" —
 * every write is scoped, and every lookup by id from another tenant fails.
 */
describe('isolamento multi-tenant (fase 2)', () => {
  let tenantA: TestTenant
  let tenantB: TestTenant

  beforeAll(async () => {
    tenantA = await createTestTenant('p2-a')
    tenantB = await createTestTenant('p2-b')
  })

  afterAll(async () => {
    await destroyTestTenant(tenantA)
    await destroyTestTenant(tenantB)
    await disconnectDb()
  })

  it('não é possível arquivar um serviço de outro salão', async () => {
    await expect(archiveService(tenantA.tenantId, tenantB.serviceId)).rejects.toThrow(
      AppError,
    )
  })

  it('não é possível criar um agendamento com profissional de outro salão', async () => {
    const { createAppointment } = await import('@/features/appointments/service')
    await expect(
      createAppointment(
        tenantA.tenantId,
        {
          clientId: tenantA.clientId,
          professionalId: tenantB.professionalId,
          date: '2027-01-04',
          time: '10:00',
          serviceIds: [tenantA.serviceId],
          source: 'INTERNAL',
        },
        { timeZone: 'America/Sao_Paulo', userId: tenantA.ownerId },
      ),
    ).rejects.toThrow(/não encontrado/)
  })

  it('não é possível buscar cliente de outro salão pelo id', async () => {
    await expect(getClient(tenantA.tenantId, tenantB.clientId)).rejects.toThrow(
      /não encontrada/,
    )
  })

  it('nomes duplicados são únicos por salão, não globalmente', async () => {
    const name = 'Serviço Compartilhado'
    const first = await createService(tenantA.tenantId, {
      name,
      categoryId: null,
      durationMinutes: 30,
      price: 50,
      cost: 0,
      commissionKind: 'PERCENT',
      commissionValue: 0,
      isActive: true,
      professionalIds: [],
    })
    // Same name, different tenant: must succeed, not collide.
    const second = await createService(tenantB.tenantId, {
      name,
      categoryId: null,
      durationMinutes: 30,
      price: 50,
      cost: 0,
      commissionKind: 'PERCENT',
      commissionValue: 0,
      isActive: true,
      professionalIds: [],
    })
    expect(first).not.toBe(second)
  })

  it('profissional criado em um salão não aparece em outro', async () => {
    const id = await createProfessional(tenantA.tenantId, {
      name: 'Profissional Exclusiva',
      specialty: '',
      phone: undefined,
      email: '',
      color: '',
      commissionPercent: 30,
      isActive: true,
    })

    const { withTenant } = await import('@/lib/db')
    const foundInB = await withTenant(tenantB.tenantId, (tx) =>
      tx.professional.findUnique({ where: { id } }),
    )
    expect(foundInB).toBeNull()

    const foundInA = await withTenant(tenantA.tenantId, (tx) =>
      tx.professional.findUnique({ where: { id } }),
    )
    expect(foundInA).not.toBeNull()
  })

  it('cliente criada em um salão não aparece em outro', async () => {
    const id = await createClient(tenantA.tenantId, {
      name: 'Cliente Exclusiva',
      phone: undefined,
      whatsapp: undefined,
      email: '',
      document: '',
      birthDate: null,
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      notes: '',
      preferences: '',
      allergies: '',
      source: '',
      preferredProfessionalId: null,
      marketingConsent: false,
    })

    await expect(getClient(tenantB.tenantId, id)).rejects.toThrow(/não encontrada/)
    await expect(getClient(tenantA.tenantId, id)).resolves.toMatchObject({
      name: 'Cliente Exclusiva',
    })
  })
})
