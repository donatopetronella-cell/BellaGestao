import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { askBellaIa, listAiQueries } from '@/features/ai/service'
import { getBellaInsights } from '@/features/insights/service'
import { disconnectDb, getAdminDb } from '@/lib/db'
import { createTestAppointment, createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

describe('bella ia', () => {
  let tenant: TestTenant

  beforeAll(async () => {
    tenant = await createTestTenant('bella-ia')
    await createTestAppointment(tenant, { status: 'FINISHED', total: 150 })
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('calcula os insights determinísticos a partir dos dados do salão', async () => {
    const insights = await getBellaInsights(tenant.tenantId, 'America/Sao_Paulo')
    expect(insights.revenueMonth).toBeGreaterThanOrEqual(150)
    expect(insights.topServices.length).toBeGreaterThan(0)
  })

  it('sem OPENAI_API_KEY responde com o retrato do salão e grava o histórico', async () => {
    const result = await askBellaIa(
      tenant.tenantId,
      tenant.ownerId,
      'Como está o faturamento?',
      'America/Sao_Paulo',
    )
    expect(result.grounded).toBe(false)
    expect(result.answer).toContain('Faturamento do mês')

    const history = await listAiQueries(tenant.tenantId)
    expect(history[0]?.question).toBe('Como está o faturamento?')
    expect(history[0]?.grounded).toBe(false)
  })

  it('não vaza pergunta de um salão para outro', async () => {
    const other = await createTestTenant('bella-ia-other')
    try {
      await askBellaIa(other.tenantId, null, 'Pergunta do outro salão', 'America/Sao_Paulo')
      const history = await listAiQueries(tenant.tenantId)
      expect(history.every((item) => item.question !== 'Pergunta do outro salão')).toBe(true)
    } finally {
      await destroyTestTenant(other)
    }
  })

  it('apaga o histórico junto com o salão (cascade)', async () => {
    const temp = await createTestTenant('bella-ia-cascade')
    await askBellaIa(temp.tenantId, null, 'Pergunta temporária', 'America/Sao_Paulo')
    await destroyTestTenant(temp)
    const remaining = await getAdminDb().aiQuery.findMany({ where: { tenantId: temp.tenantId } })
    expect(remaining).toHaveLength(0)
  })
})
