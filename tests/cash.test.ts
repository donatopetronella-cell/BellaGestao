import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  addCashMovement,
  closeRegister,
  getOpenRegister,
  openRegister,
} from '@/features/cash/service'
import { disconnectDb } from '@/lib/db'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

describe('caixa', () => {
  let tenant: TestTenant

  beforeAll(async () => {
    tenant = await createTestTenant('cash')
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('não abre um segundo caixa enquanto o primeiro está aberto', async () => {
    await openRegister(tenant.tenantId, { openingAmount: 100, userId: tenant.ownerId })
    await expect(
      openRegister(tenant.tenantId, { openingAmount: 50, userId: tenant.ownerId }),
    ).rejects.toThrow(/já existe um caixa aberto/i)
  })

  it('sangria e reforço em dinheiro alteram o valor esperado na gaveta', async () => {
    await addCashMovement(tenant.tenantId, {
      type: 'REINFORCEMENT',
      method: 'CASH',
      amount: 50,
      description: 'Troco extra',
      userId: tenant.ownerId,
    })
    await addCashMovement(tenant.tenantId, {
      type: 'WITHDRAWAL',
      method: 'CASH',
      amount: 30,
      description: 'Retirada para o banco',
      userId: tenant.ownerId,
    })

    const register = await getOpenRegister(tenant.tenantId)
    expect(register?.cashInDrawer).toBe(120) // 100 + 50 - 30
  })

  it('movimentação em cartão não afeta o dinheiro na gaveta', async () => {
    await addCashMovement(tenant.tenantId, {
      type: 'IN',
      method: 'CREDIT_CARD',
      amount: 200,
      description: 'Venda avulsa',
      userId: tenant.ownerId,
    })
    const register = await getOpenRegister(tenant.tenantId)
    expect(register?.cashInDrawer).toBe(120)
    expect(register?.totalIn).toBeGreaterThanOrEqual(250)
  })

  it('fechar o caixa calcula a diferença entre contado e esperado', async () => {
    const register = await getOpenRegister(tenant.tenantId)
    const result = await closeRegister(tenant.tenantId, {
      registerId: register!.id,
      closingAmount: 115,
      userId: tenant.ownerId,
    })
    expect(result.expected).toBe(120)
    expect(result.difference).toBe(-5)

    expect(await getOpenRegister(tenant.tenantId)).toBeNull()
  })

  it('não é possível fechar um caixa já fechado', async () => {
    const db = await import('@/lib/db')
    const register = await db.getAdminDb().cashRegister.findFirst({
      where: { tenantId: tenant.tenantId },
      orderBy: { openedAt: 'desc' },
    })
    await expect(
      closeRegister(tenant.tenantId, {
        registerId: register!.id,
        closingAmount: 100,
        userId: tenant.ownerId,
      }),
    ).rejects.toThrow(/já foi fechado/)
  })

  it('não é possível movimentar sem caixa aberto', async () => {
    await expect(
      addCashMovement(tenant.tenantId, {
        type: 'OUT',
        method: 'CASH',
        amount: 10,
        description: 'Compra qualquer',
        userId: tenant.ownerId,
      }),
    ).rejects.toThrow(/abra o caixa/i)
  })
})
