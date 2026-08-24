import 'server-only'
import { withTenant } from '@/lib/db'
import { notFound, validationError } from '@/lib/errors'
import type { LoyaltyAdjustInput, LoyaltyProgramInput } from '@/validators/loyalty'

export interface LoyaltyProgramData {
  mode: 'POINTS' | 'CASHBACK' | 'VISITS'
  pointsPerCurrency: number
  currencyPerPoint: number
  minRedeemPoints: number
  cashbackPercent: number
  visitsForReward: number
  rewardDescription: string | null
  isActive: boolean
}

export async function getLoyaltyProgram(tenantId: string): Promise<LoyaltyProgramData> {
  const row = await withTenant(tenantId, (tx) =>
    tx.loyaltyProgram.findUnique({ where: { tenantId } }),
  )
  if (!row) {
    return {
      mode: 'POINTS',
      pointsPerCurrency: 1,
      currencyPerPoint: 0.06,
      minRedeemPoints: 500,
      cashbackPercent: 0,
      visitsForReward: 10,
      rewardDescription: null,
      isActive: false,
    }
  }
  return {
    mode: row.mode,
    pointsPerCurrency: Number(row.pointsPerCurrency),
    currencyPerPoint: Number(row.currencyPerPoint),
    minRedeemPoints: row.minRedeemPoints,
    cashbackPercent: Number(row.cashbackPercent),
    visitsForReward: row.visitsForReward,
    rewardDescription: row.rewardDescription,
    isActive: row.isActive,
  }
}

export async function saveLoyaltyProgram(
  tenantId: string,
  input: LoyaltyProgramInput,
): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.loyaltyProgram.upsert({
      where: { tenantId },
      create: {
        tenantId,
        mode: input.mode,
        pointsPerCurrency: input.pointsPerCurrency,
        currencyPerPoint: input.currencyPerPoint,
        minRedeemPoints: input.minRedeemPoints,
        cashbackPercent: input.cashbackPercent,
        visitsForReward: input.visitsForReward,
        rewardDescription: input.rewardDescription || null,
        isActive: input.isActive,
      },
      update: {
        mode: input.mode,
        pointsPerCurrency: input.pointsPerCurrency,
        currencyPerPoint: input.currencyPerPoint,
        minRedeemPoints: input.minRedeemPoints,
        cashbackPercent: input.cashbackPercent,
        visitsForReward: input.visitsForReward,
        rewardDescription: input.rewardDescription || null,
        isActive: input.isActive,
      },
    }),
  )
}

export interface LoyaltyAccountItem {
  id: string
  clientId: string
  clientName: string
  pointsBalance: number
  cashbackBalance: number
  visits: number
}

export interface LoyaltyAccountListResult {
  items: LoyaltyAccountItem[]
  total: number
  page: number
  perPage: number
}

export async function listLoyaltyAccounts(
  tenantId: string,
  options: { search?: string; page?: number; perPage?: number } = {},
): Promise<LoyaltyAccountListResult> {
  const page = Math.max(1, options.page ?? 1)
  const perPage = Math.min(100, options.perPage ?? 20)

  return withTenant(tenantId, async (tx) => {
    const where = {
      tenantId,
      ...(options.search
        ? { client: { name: { contains: options.search, mode: 'insensitive' as const } } }
        : {}),
    }
    const total = await tx.loyaltyAccount.count({ where })
    const rows = await tx.loyaltyAccount.findMany({
      where,
      orderBy: { pointsBalance: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        clientId: true,
        pointsBalance: true,
        cashbackBalance: true,
        visits: true,
        client: { select: { name: true } },
      },
    })
    return {
      total,
      page,
      perPage,
      items: rows.map((row) => ({
        id: row.id,
        clientId: row.clientId,
        clientName: row.client.name,
        pointsBalance: row.pointsBalance,
        cashbackBalance: Number(row.cashbackBalance),
        visits: row.visits,
      })),
    }
  })
}

export interface LoyaltyTransactionRow {
  id: string
  type: string
  points: number
  amount: number
  description: string | null
  createdAt: Date
}

export async function listLoyaltyTransactions(
  tenantId: string,
  clientId: string,
): Promise<LoyaltyTransactionRow[]> {
  return withTenant(tenantId, async (tx) => {
    const account = await tx.loyaltyAccount.findFirst({
      where: { tenantId, clientId },
      select: { id: true },
    })
    if (!account) return []

    const rows = await tx.loyaltyTransaction.findMany({
      where: { tenantId, accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        type: true,
        points: true,
        amount: true,
        description: true,
        createdAt: true,
      },
    })
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }))
  })
}

/** Manual credit, debit or adjustment — receptionist redeeming points at the register. */
export async function adjustLoyaltyAccount(
  tenantId: string,
  input: LoyaltyAdjustInput,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: input.clientId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!client) throw notFound('Cliente não encontrada.')

    const account = await tx.loyaltyAccount.upsert({
      where: { clientId: input.clientId },
      create: { tenantId, clientId: input.clientId, pointsBalance: 0, visits: 0 },
      update: {},
      select: { id: true, pointsBalance: true },
    })

    const delta = input.type === 'REDEEM' ? -Math.abs(input.points) : input.points
    if (account.pointsBalance + delta < 0) {
      throw validationError('Saldo de pontos insuficiente para este resgate.')
    }

    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: { pointsBalance: { increment: delta } },
    })

    await tx.loyaltyTransaction.create({
      data: {
        tenantId,
        accountId: account.id,
        type: input.type,
        points: delta,
        amount: input.amount,
        description: input.description || null,
      },
    })
  })
}
