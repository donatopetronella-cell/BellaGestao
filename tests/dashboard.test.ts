import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getDashboardData, getTodayAgenda } from '@/features/dashboard/queries'
import { getSalonSetup, saveSalonSetup } from '@/features/settings/service'
import { disconnectDb } from '@/lib/db'
import {
  createTestAppointment,
  createTestTenant,
  destroyTestTenant,
  type TestTenant,
} from './helpers'

const TIMEZONE = 'America/Sao_Paulo'

function todayAt(hour: number): Date {
  const date = new Date()
  date.setUTCHours(hour + 3, 0, 0, 0)
  return date
}

describe('dashboard', () => {
  let tenantA: TestTenant
  let tenantB: TestTenant

  beforeAll(async () => {
    tenantA = await createTestTenant('dash-a')
    tenantB = await createTestTenant('dash-b')

    await createTestAppointment(tenantA, { startsAt: todayAt(9), total: 120 })
    await createTestAppointment(tenantA, { startsAt: todayAt(11), total: 260 })
    await createTestAppointment(tenantA, {
      startsAt: todayAt(15),
      status: 'CONFIRMED',
      total: 80,
    })

    for (let index = 0; index < 5; index += 1) {
      await createTestAppointment(tenantB, { startsAt: todayAt(10), total: 999 })
    }
  })

  afterAll(async () => {
    await destroyTestTenant(tenantA)
    await destroyTestTenant(tenantB)
    await disconnectDb()
  })

  it('consolida os indicadores do dia a partir dos dados reais do salão', async () => {
    const data = await getDashboardData(tenantA.tenantId, {
      range: 'month',
      timeZone: TIMEZONE,
    })

    expect(data.today.scheduled).toBe(3)
    expect(data.today.finished).toBe(2)
    expect(data.today.confirmed).toBe(1)
    expect(data.today.expectedRevenue).toBe(460)
    expect(data.today.activeProfessionals).toBe(1)
  })

  it('não mistura o faturamento de outro salão', async () => {
    const dataA = await getDashboardData(tenantA.tenantId, {
      range: 'month',
      timeZone: TIMEZONE,
    })
    const dataB = await getDashboardData(tenantB.tenantId, {
      range: 'month',
      timeZone: TIMEZONE,
    })

    expect(dataA.today.expectedRevenue).toBe(460)
    expect(dataB.today.expectedRevenue).toBe(4995)
    expect(dataA.professionals).toHaveLength(1)
    expect(dataA.professionals[0]?.revenue).toBe(380)
    expect(dataB.professionals[0]?.revenue).toBe(4995)
  })

  it('calcula ticket médio e serviços mais vendidos por período', async () => {
    const data = await getDashboardData(tenantA.tenantId, {
      range: '30d',
      timeZone: TIMEZONE,
    })

    expect(data.professionals[0]?.appointments).toBe(2)
    expect(data.professionals[0]?.averageTicket).toBe(190)
    expect(data.topServices[0]?.quantity).toBe(2)
    expect(data.topServices[0]?.revenue).toBe(380)
  })

  it('profissional vê apenas os próprios números, inclusive nos gráficos', async () => {
    const full = await getDashboardData(tenantA.tenantId, {
      range: 'month',
      timeZone: TIMEZONE,
    })
    const scopedToOther = await getDashboardData(tenantA.tenantId, {
      range: 'month',
      timeZone: TIMEZONE,
      professionalId: tenantB.professionalId,
    })

    expect(full.topServices.length).toBeGreaterThan(0)
    expect(scopedToOther.topServices).toEqual([])
    expect(scopedToOther.dailyRevenue).toEqual([])
    expect(scopedToOther.today.scheduled).toBe(0)

    const scopedToOwn = await getDashboardData(tenantA.tenantId, {
      range: 'month',
      timeZone: TIMEZONE,
      professionalId: tenantA.professionalId,
    })
    expect(scopedToOwn.topServices[0]?.revenue).toBe(380)
  })

  it('agenda do dia traz apenas os atendimentos do próprio salão', async () => {
    const agenda = await getTodayAgenda(tenantA.tenantId, { timeZone: TIMEZONE })
    expect(agenda).toHaveLength(3)
    expect(agenda.every((entry) => entry.clientName.includes('dash-a'))).toBe(true)
    expect(agenda[0]!.startsAt.getTime()).toBeLessThan(agenda[1]!.startsAt.getTime())
  })

  it('meta mensal alimenta a barra de progresso', async () => {
    const setup = await getSalonSetup(tenantA.tenantId)
    await saveSalonSetup(tenantA.tenantId, {
      ...setup,
      legalName: '',
      document: '',
      email: '',
      currency: 'BRL',
      monthlyRevenueGoal: 1000,
    })

    const data = await getDashboardData(tenantA.tenantId, {
      range: 'month',
      timeZone: TIMEZONE,
    })
    expect(data.finance.monthlyGoal).toBe(1000)
    expect(data.finance.goalProgress).not.toBeNull()
  })
})
