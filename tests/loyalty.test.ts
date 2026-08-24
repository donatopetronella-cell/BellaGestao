import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  adjustLoyaltyAccount,
  getLoyaltyProgram,
  listLoyaltyAccounts,
  listLoyaltyTransactions,
  saveLoyaltyProgram,
} from '@/features/loyalty/service'
import { AppError } from '@/lib/errors'
import { disconnectDb } from '@/lib/db'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

describe('fidelidade', () => {
  let tenant: TestTenant

  beforeAll(async () => {
    tenant = await createTestTenant('loyalty')
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('começa desativado e salva a configuração do programa', async () => {
    const initial = await getLoyaltyProgram(tenant.tenantId)
    expect(initial.isActive).toBe(false)

    await saveLoyaltyProgram(tenant.tenantId, {
      mode: 'POINTS',
      pointsPerCurrency: 2,
      currencyPerPoint: 0.05,
      minRedeemPoints: 200,
      cashbackPercent: 0,
      visitsForReward: 10,
      rewardDescription: '200 pontos = R$ 10',
      isActive: true,
    })

    const saved = await getLoyaltyProgram(tenant.tenantId)
    expect(saved.isActive).toBe(true)
    expect(saved.pointsPerCurrency).toBe(2)
  })

  it('credita e resgata pontos, recusando saldo negativo', async () => {
    await adjustLoyaltyAccount(tenant.tenantId, {
      clientId: tenant.clientId,
      type: 'EARN',
      points: 300,
      amount: 0,
      description: 'Crédito manual',
    })

    const accounts = await listLoyaltyAccounts(tenant.tenantId)
    const account = accounts.items.find((item) => item.clientId === tenant.clientId)
    expect(account?.pointsBalance).toBe(300)

    await adjustLoyaltyAccount(tenant.tenantId, {
      clientId: tenant.clientId,
      type: 'REDEEM',
      points: 100,
      amount: 6,
      description: 'Resgate no caixa',
    })

    const afterRedeem = await listLoyaltyAccounts(tenant.tenantId)
    expect(afterRedeem.items.find((item) => item.clientId === tenant.clientId)?.pointsBalance).toBe(
      200,
    )

    await expect(
      adjustLoyaltyAccount(tenant.tenantId, {
        clientId: tenant.clientId,
        type: 'REDEEM',
        points: 999,
        amount: 0,
        description: '',
      }),
    ).rejects.toThrow(AppError)

    const transactions = await listLoyaltyTransactions(tenant.tenantId, tenant.clientId)
    expect(transactions.length).toBe(2)
  })
})
