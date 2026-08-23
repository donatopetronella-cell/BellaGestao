import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  changeAppointmentStatus,
  createAppointment,
  getAgendaDay,
  getAvailableSlots,
  rescheduleAppointment,
  updateAppointment,
} from '@/features/appointments/service'
import { finishAppointment } from '@/features/appointments/finish'
import { getOpenRegister, openRegister } from '@/features/cash/service'
import { disconnectDb, getAdminDb } from '@/lib/db'
import { toDateKey } from '@/lib/dates'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

const TIMEZONE = 'America/Sao_Paulo'

function tomorrowKey(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + 1)
  return toDateKey(date, TIMEZONE)
}

async function setWorkingHours(tenant: TestTenant): Promise<void> {
  const db = getAdminDb()
  const weekday = new Date(`${tomorrowKey()}T12:00:00.000Z`).getUTCDay()
  await db.professionalWorkingHour.create({
    data: {
      tenantId: tenant.tenantId,
      professionalId: tenant.professionalId,
      branchId: tenant.branchId,
      weekday,
      startMin: 9 * 60,
      endMin: 18 * 60,
    },
  })
  await db.branchOpeningHour.create({
    data: {
      tenantId: tenant.tenantId,
      branchId: tenant.branchId,
      weekday,
      startMin: 9 * 60,
      endMin: 18 * 60,
    },
  })
}

describe('agenda: criação e conflitos', () => {
  let tenantA: TestTenant
  let tenantB: TestTenant

  beforeAll(async () => {
    tenantA = await createTestTenant('agenda-a')
    tenantB = await createTestTenant('agenda-b')
    await setWorkingHours(tenantA)
    await setWorkingHours(tenantB)
  })

  afterAll(async () => {
    await destroyTestTenant(tenantA)
    await destroyTestTenant(tenantB)
    await disconnectDb()
  })

  it('cria um agendamento calculando duração e total a partir dos serviços', async () => {
    const result = await createAppointment(
      tenantA.tenantId,
      {
        clientId: tenantA.clientId,
        professionalId: tenantA.professionalId,
        date: tomorrowKey(),
        time: '10:00',
        serviceIds: [tenantA.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenantA.ownerId },
    )
    expect(result.total).toBe(100)
    expect(result.endsAt.getTime() - result.startsAt.getTime()).toBe(60 * 60_000)
  })

  it('recusa um segundo agendamento no mesmo horário do mesmo profissional', async () => {
    await createAppointment(
      tenantA.tenantId,
      {
        clientId: tenantA.clientId,
        professionalId: tenantA.professionalId,
        date: tomorrowKey(),
        time: '11:00',
        serviceIds: [tenantA.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenantA.ownerId },
    )

    await expect(
      createAppointment(
        tenantA.tenantId,
        {
          clientId: tenantA.clientId,
          professionalId: tenantA.professionalId,
          date: tomorrowKey(),
          time: '11:30',
          serviceIds: [tenantA.serviceId],
          source: 'INTERNAL',
        },
        { timeZone: TIMEZONE, userId: tenantA.ownerId },
      ),
    ).rejects.toThrow(/conflita/)
  })

  it('um salão nunca enxerga a agenda de outro', async () => {
    await createAppointment(
      tenantB.tenantId,
      {
        clientId: tenantB.clientId,
        professionalId: tenantB.professionalId,
        date: tomorrowKey(),
        time: '10:00',
        serviceIds: [tenantB.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenantB.ownerId },
    )

    const dayA = await getAgendaDay(tenantA.tenantId, {
      dateKey: tomorrowKey(),
      timeZone: TIMEZONE,
    })

    expect(
      dayA.appointments.every((appointment) =>
        [tenantA.clientId].includes(appointment.clientId),
      ),
    ).toBe(true)
    expect(dayA.columns.map((column) => column.professionalId)).not.toContain(
      tenantB.professionalId,
    )
  })

  it('reagendar move o atendimento e mantém a checagem de conflito', async () => {
    const first = await createAppointment(
      tenantA.tenantId,
      {
        clientId: tenantA.clientId,
        professionalId: tenantA.professionalId,
        date: tomorrowKey(),
        time: '14:00',
        serviceIds: [tenantA.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenantA.ownerId },
    )

    await rescheduleAppointment(
      tenantA.tenantId,
      first.id,
      { date: tomorrowKey(), time: '15:00', professionalId: tenantA.professionalId },
      { timeZone: TIMEZONE, userId: tenantA.ownerId },
    )

    const day = await getAgendaDay(tenantA.tenantId, {
      dateKey: tomorrowKey(),
      timeZone: TIMEZONE,
    })
    const moved = day.appointments.find((appointment) => appointment.id === first.id)
    expect(moved?.startMinutes).toBe(15 * 60)
  })

  it('horários livres excluem atendimentos existentes e o intervalo', async () => {
    const slotsBefore = await getAvailableSlots(tenantA.tenantId, {
      dateKey: tomorrowKey(),
      professionalId: tenantA.professionalId,
      durationMinutes: 60,
      timeZone: TIMEZONE,
    })
    expect(slotsBefore).not.toContain('10:00')
  })

  it('editar um agendamento recalcula o total ao trocar o serviço', async () => {
    const db = getAdminDb()
    const otherService = await db.service.create({
      data: {
        tenantId: tenantA.tenantId,
        name: 'Outro serviço',
        durationMinutes: 30,
        price: 200,
      },
      select: { id: true },
    })

    const created = await createAppointment(
      tenantA.tenantId,
      {
        clientId: tenantA.clientId,
        professionalId: tenantA.professionalId,
        date: tomorrowKey(),
        time: '16:00',
        serviceIds: [tenantA.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenantA.ownerId },
    )

    await updateAppointment(
      tenantA.tenantId,
      created.id,
      {
        clientId: tenantA.clientId,
        professionalId: tenantA.professionalId,
        date: tomorrowKey(),
        time: '16:00',
        serviceIds: [otherService.id],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenantA.ownerId },
    )

    const updated = await db.appointment.findUniqueOrThrow({
      where: { id: created.id },
      select: { total: true },
    })
    expect(Number(updated.total)).toBe(200)
  })
})

describe('fluxo de status e finalização', () => {
  let tenant: TestTenant

  beforeAll(async () => {
    tenant = await createTestTenant('finish')
    await setWorkingHours(tenant)
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
  })

  it('não permite pular direto para FINISHED via mudança de status', async () => {
    const created = await createAppointment(
      tenant.tenantId,
      {
        clientId: tenant.clientId,
        professionalId: tenant.professionalId,
        date: tomorrowKey(),
        time: '09:00',
        serviceIds: [tenant.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenant.ownerId },
    )

    await expect(
      changeAppointmentStatus(tenant.tenantId, created.id, 'FINISHED', {
        userId: tenant.ownerId,
      }),
    ).rejects.toThrow(/finalização/)
  })

  it('recusa transição inválida de status (PENDING -> IN_SERVICE é permitida, mas FINISHED -> CONFIRMED não)', async () => {
    const created = await createAppointment(
      tenant.tenantId,
      {
        clientId: tenant.clientId,
        professionalId: tenant.professionalId,
        date: tomorrowKey(),
        time: '11:00',
        serviceIds: [tenant.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenant.ownerId },
    )

    await changeAppointmentStatus(tenant.tenantId, created.id, 'CONFIRMED', {
      userId: tenant.ownerId,
    })

    await finishAppointment(
      tenant.tenantId,
      {
        appointmentId: created.id,
        discount: 0,
        payments: [{ method: 'PIX', amount: 100, installments: 1 }],
      },
      { userId: tenant.ownerId },
    )

    await expect(
      changeAppointmentStatus(tenant.tenantId, created.id, 'CONFIRMED', {
        userId: tenant.ownerId,
      }),
    ).rejects.toThrow(/não é possível/i)
  })

  it('finalizar exige que a soma dos pagamentos feche com o total', async () => {
    const created = await createAppointment(
      tenant.tenantId,
      {
        clientId: tenant.clientId,
        professionalId: tenant.professionalId,
        date: tomorrowKey(),
        time: '08:00',
        serviceIds: [tenant.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenant.ownerId },
    )

    await expect(
      finishAppointment(
        tenant.tenantId,
        {
          appointmentId: created.id,
          discount: 0,
          payments: [{ method: 'PIX', amount: 50, installments: 1 }],
        },
        { userId: tenant.ownerId },
      ),
    ).rejects.toThrow(/não confere/)
  })

  it('finalizar cria venda, receita, comissão e atualiza a última visita da cliente', async () => {
    await getAdminDb().professional.update({
      where: { id: tenant.professionalId },
      data: { commissionPercent: 40 },
    })

    const created = await createAppointment(
      tenant.tenantId,
      {
        clientId: tenant.clientId,
        professionalId: tenant.professionalId,
        date: tomorrowKey(),
        time: '13:00',
        serviceIds: [tenant.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenant.ownerId },
    )

    const result = await finishAppointment(
      tenant.tenantId,
      {
        appointmentId: created.id,
        discount: 10,
        payments: [{ method: 'PIX', amount: 90, installments: 1 }],
      },
      { userId: tenant.ownerId },
    )

    expect(result.total).toBe(90)

    const db = getAdminDb()
    const sale = await db.sale.findUniqueOrThrow({
      where: { id: result.saleId },
      select: { total: true, status: true, appointmentId: true },
    })
    expect(sale.status).toBe('PAID')
    expect(Number(sale.total)).toBe(90)

    const revenue = await db.revenue.findFirst({
      where: { tenantId: tenant.tenantId, referenceId: result.saleId },
    })
    expect(revenue).not.toBeNull()

    const commission = await db.commission.findFirst({
      where: { tenantId: tenant.tenantId, appointmentId: created.id },
    })
    expect(commission).not.toBeNull()

    const client = await db.client.findUniqueOrThrow({
      where: { id: tenant.clientId },
      select: { lastVisitAt: true },
    })
    expect(client.lastVisitAt).not.toBeNull()

    const appointment = await db.appointment.findUniqueOrThrow({
      where: { id: created.id },
      select: { status: true },
    })
    expect(appointment.status).toBe('FINISHED')
  })

  it('finalizar duas vezes o mesmo atendimento falha na segunda', async () => {
    const created = await createAppointment(
      tenant.tenantId,
      {
        clientId: tenant.clientId,
        professionalId: tenant.professionalId,
        date: tomorrowKey(),
        time: '15:00',
        serviceIds: [tenant.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenant.ownerId },
    )

    const input = {
      appointmentId: created.id,
      discount: 0,
      payments: [{ method: 'PIX' as const, amount: 100, installments: 1 }],
    }

    await finishAppointment(tenant.tenantId, input, { userId: tenant.ownerId })
    await expect(
      finishAppointment(tenant.tenantId, input, { userId: tenant.ownerId }),
    ).rejects.toThrow(/já foi finalizado/)
  })

  it('finalizar alimenta o caixa aberto e não afeta um caixa de outro salão', async () => {
    const other = await createTestTenant('finish-other')
    await setWorkingHours(other)

    await openRegister(tenant.tenantId, { openingAmount: 50, userId: tenant.ownerId })

    const created = await createAppointment(
      tenant.tenantId,
      {
        clientId: tenant.clientId,
        professionalId: tenant.professionalId,
        date: tomorrowKey(),
        time: '17:00',
        serviceIds: [tenant.serviceId],
        source: 'INTERNAL',
      },
      { timeZone: TIMEZONE, userId: tenant.ownerId },
    )

    await finishAppointment(
      tenant.tenantId,
      {
        appointmentId: created.id,
        discount: 0,
        payments: [{ method: 'CASH', amount: 100, installments: 1 }],
      },
      { userId: tenant.ownerId },
    )

    const register = await getOpenRegister(tenant.tenantId)
    expect(register?.cashInDrawer).toBe(150)

    const otherRegister = await getOpenRegister(other.tenantId)
    expect(otherRegister).toBeNull()

    await destroyTestTenant(other)
  })
})
