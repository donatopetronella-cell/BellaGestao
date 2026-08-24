import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createPublicBooking,
  getPublicSalon,
  getPublicServices,
  getPublicSlots,
} from '@/features/booking/service'
import { disconnectDb, getAdminDb } from '@/lib/db'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

describe('agenda online', () => {
  let tenant: TestTenant

  beforeAll(async () => {
    tenant = await createTestTenant('booking')
    await getAdminDb().serviceProfessional.create({
      data: { tenantId: tenant.tenantId, serviceId: tenant.serviceId, professionalId: tenant.professionalId },
    })
    await getAdminDb().professionalWorkingHour.create({
      data: {
        tenantId: tenant.tenantId,
        professionalId: tenant.professionalId,
        weekday: new Date().getDay(),
        startMin: 0,
        endMin: 24 * 60,
      },
    })
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('resolve o salão pelo slug e lista somente serviços com profissional vinculado', async () => {
    const salon = await getPublicSalon(tenant.slug)
    expect(salon?.id).toBe(tenant.tenantId)

    const missing = await getPublicSalon('slug-que-nao-existe')
    expect(missing).toBeNull()

    const services = await getPublicServices(tenant.tenantId)
    expect(services).toHaveLength(1)
    expect(services[0]?.professionals).toEqual([
      { id: tenant.professionalId, name: expect.any(String) },
    ])
  })

  it('lista horários livres e cria o agendamento com a cliente encontrada por telefone', async () => {
    const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(),
    )
    const slots = await getPublicSlots(tenant.tenantId, {
      serviceId: tenant.serviceId,
      professionalId: tenant.professionalId,
      dateKey,
      timeZone: 'America/Sao_Paulo',
    })
    expect(slots.length).toBeGreaterThan(0)

    const result = await createPublicBooking(
      {
        tenantId: tenant.tenantId,
        serviceId: tenant.serviceId,
        professionalId: tenant.professionalId,
        date: dateKey,
        time: slots[0]!,
        clientName: 'Cliente Online',
        clientPhone: '(11) 90000-0000',
        notes: '',
      },
      'America/Sao_Paulo',
    )
    expect(result.id).toBeTruthy()

    const appointment = await getAdminDb().appointment.findUnique({
      where: { id: result.id },
      select: { source: true, clientId: true },
    })
    expect(appointment?.source).toBe('ONLINE')
    expect(appointment?.clientId).toBe(tenant.clientId)
  })
})
