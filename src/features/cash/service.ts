import 'server-only'
import type { CashMovementType, PaymentMethod } from '@/generated/prisma/enums'
import { withTenant, type TenantClient } from '@/lib/db'
import { conflict, notFound } from '@/lib/errors'

export interface CashMovementRow {
  id: string
  type: CashMovementType
  method: PaymentMethod
  amount: number
  description: string | null
  createdAt: Date
}

export interface CashRegisterSummary {
  id: string
  status: 'OPEN' | 'CLOSED'
  openingAmount: number
  openedAt: Date
  closedAt: Date | null
  closingAmount: number | null
  expectedAmount: number | null
  difference: number | null
  notes: string | null
  totalsByMethod: Array<{ method: PaymentMethod; amount: number }>
  cashInDrawer: number
  totalIn: number
  totalOut: number
  salesTotal: number
  movements: CashMovementRow[]
}

/** Cash actually in the drawer: opening + cash in − cash out. */
export function computeExpectedCash(
  openingAmount: number,
  movements: Array<{ type: CashMovementType; method: PaymentMethod; amount: number }>,
): number {
  return movements.reduce((total, movement) => {
    if (movement.method !== 'CASH') return total
    switch (movement.type) {
      case 'SALE':
      case 'IN':
      case 'REINFORCEMENT':
        return total + movement.amount
      case 'OUT':
      case 'WITHDRAWAL':
        return total - movement.amount
      default:
        return total
    }
  }, openingAmount)
}

async function loadSummary(
  tx: TenantClient,
  tenantId: string,
  registerId: string,
): Promise<CashRegisterSummary> {
  const register = await tx.cashRegister.findFirst({
    where: { id: registerId, tenantId },
    select: {
      id: true,
      status: true,
      openingAmount: true,
      closingAmount: true,
      expectedAmount: true,
      difference: true,
      openedAt: true,
      closedAt: true,
      notes: true,
      movements: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          method: true,
          amount: true,
          description: true,
          createdAt: true,
        },
      },
    },
  })
  if (!register) throw notFound('Caixa não encontrado.')

  const movements: CashMovementRow[] = register.movements.map((movement) => ({
    id: movement.id,
    type: movement.type,
    method: movement.method,
    amount: Number(movement.amount),
    description: movement.description,
    createdAt: movement.createdAt,
  }))

  const totals = new Map<PaymentMethod, number>()
  let totalIn = 0
  let totalOut = 0
  let salesTotal = 0

  for (const movement of movements) {
    if (movement.type === 'OUT' || movement.type === 'WITHDRAWAL') {
      totalOut += movement.amount
      continue
    }
    totalIn += movement.amount
    if (movement.type === 'SALE') {
      salesTotal += movement.amount
      totals.set(movement.method, (totals.get(movement.method) ?? 0) + movement.amount)
    }
  }

  return {
    id: register.id,
    status: register.status,
    openingAmount: Number(register.openingAmount),
    openedAt: register.openedAt,
    closedAt: register.closedAt,
    closingAmount:
      register.closingAmount === null ? null : Number(register.closingAmount),
    expectedAmount:
      register.expectedAmount === null ? null : Number(register.expectedAmount),
    difference: register.difference === null ? null : Number(register.difference),
    notes: register.notes,
    totalsByMethod: [...totals.entries()].map(([method, amount]) => ({
      method,
      amount,
    })),
    cashInDrawer: computeExpectedCash(Number(register.openingAmount), movements),
    totalIn,
    totalOut,
    salesTotal,
    movements,
  }
}

export async function getOpenRegister(
  tenantId: string,
): Promise<CashRegisterSummary | null> {
  return withTenant(tenantId, async (tx) => {
    const open = await tx.cashRegister.findFirst({
      where: { tenantId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    })
    if (!open) return null
    return loadSummary(tx, tenantId, open.id)
  })
}

export async function getRegister(
  tenantId: string,
  registerId: string,
): Promise<CashRegisterSummary> {
  return withTenant(tenantId, (tx) => loadSummary(tx, tenantId, registerId))
}

export interface RegisterListItem {
  id: string
  status: 'OPEN' | 'CLOSED'
  openedAt: Date
  closedAt: Date | null
  openingAmount: number
  closingAmount: number | null
  difference: number | null
}

export async function listRegisters(
  tenantId: string,
  take = 10,
): Promise<RegisterListItem[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.cashRegister.findMany({
      where: { tenantId },
      orderBy: { openedAt: 'desc' },
      take,
      select: {
        id: true,
        status: true,
        openedAt: true,
        closedAt: true,
        openingAmount: true,
        closingAmount: true,
        difference: true,
      },
    }),
  )

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    openingAmount: Number(row.openingAmount),
    closingAmount: row.closingAmount === null ? null : Number(row.closingAmount),
    difference: row.difference === null ? null : Number(row.difference),
  }))
}

export async function openRegister(
  tenantId: string,
  input: { openingAmount: number; notes?: string; userId?: string | null },
): Promise<string> {
  return withTenant(
    tenantId,
    async (tx) => {
      const alreadyOpen = await tx.cashRegister.findFirst({
        where: { tenantId, status: 'OPEN' },
        select: { id: true },
      })
      if (alreadyOpen) throw conflict('Já existe um caixa aberto.')

      const branch = await tx.branch.findFirst({
        where: { tenantId, isDefault: true },
        select: { id: true },
      })
      if (!branch) throw notFound('Nenhuma unidade configurada.')

      const register = await tx.cashRegister.create({
        data: {
          tenantId,
          branchId: branch.id,
          openingAmount: input.openingAmount,
          openedById: input.userId ?? null,
          notes: input.notes || null,
        },
        select: { id: true },
      })
      return register.id
    },
    input.userId ?? null,
  )
}

export async function closeRegister(
  tenantId: string,
  input: {
    registerId: string
    closingAmount: number
    notes?: string
    userId?: string | null
  },
): Promise<{ expected: number; difference: number }> {
  return withTenant(
    tenantId,
    async (tx) => {
      const summary = await loadSummary(tx, tenantId, input.registerId)
      if (summary.status === 'CLOSED') throw conflict('Este caixa já foi fechado.')

      const expected = summary.cashInDrawer
      const difference = Math.round((input.closingAmount - expected) * 100) / 100

      await tx.cashRegister.update({
        where: { id: input.registerId },
        data: {
          status: 'CLOSED',
          closingAmount: input.closingAmount,
          expectedAmount: expected,
          difference,
          closedAt: new Date(),
          closedById: input.userId ?? null,
          notes: input.notes || summary.notes,
        },
      })

      return { expected, difference }
    },
    input.userId ?? null,
  )
}

export async function addCashMovement(
  tenantId: string,
  input: {
    type: CashMovementType
    method: PaymentMethod
    amount: number
    description: string
    userId?: string | null
  },
): Promise<void> {
  await withTenant(
    tenantId,
    async (tx) => {
      const register = await tx.cashRegister.findFirst({
        where: { tenantId, status: 'OPEN' },
        select: { id: true },
      })
      if (!register) {
        throw conflict('Abra o caixa antes de registrar movimentações.')
      }

      await tx.cashMovement.create({
        data: {
          tenantId,
          cashRegisterId: register.id,
          type: input.type,
          method: input.method,
          amount: input.amount,
          description: input.description,
          createdById: input.userId ?? null,
        },
      })
    },
    input.userId ?? null,
  )
}
