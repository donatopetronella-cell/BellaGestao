'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  addCashMovement,
  closeRegister,
  openRegister,
} from '@/features/cash/service'
import {
  cashMovementSchema,
  closeRegisterSchema,
  openRegisterSchema,
} from '@/validators/cash'
import { formatCurrency } from '@/lib/utils'
import type { FormState } from './types'
import { fail, fromZod, ok, text } from './form'

export async function openRegisterAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('cash.open')
  const parsed = openRegisterSchema.safeParse({
    openingAmount: text(formData, 'openingAmount') || 0,
    notes: text(formData, 'notes'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await openRegister(context.tenant.id, {
      openingAmount: parsed.data.openingAmount,
      notes: parsed.data.notes,
      userId: context.user.id,
    })
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'cash.opened',
      entity: 'cash_register',
      entityId: id,
      summary: `Caixa aberto com ${formatCurrency(parsed.data.openingAmount)}`,
    })
    revalidatePath('/caixa')
    return ok('Caixa aberto.')
  } catch (error) {
    return fail(error)
  }
}

export async function closeRegisterAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('cash.close')
  const parsed = closeRegisterSchema.safeParse({
    registerId: text(formData, 'registerId'),
    closingAmount: text(formData, 'closingAmount') || 0,
    notes: text(formData, 'notes'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const result = await closeRegister(context.tenant.id, {
      registerId: parsed.data.registerId,
      closingAmount: parsed.data.closingAmount,
      notes: parsed.data.notes,
      userId: context.user.id,
    })
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'cash.closed',
      entity: 'cash_register',
      entityId: parsed.data.registerId,
      summary: `Caixa fechado · diferença ${formatCurrency(result.difference)}`,
    })
    revalidatePath('/caixa')

    if (Math.abs(result.difference) < 0.01) {
      return ok('Caixa fechado. Valores conferem.')
    }
    return ok(
      `Caixa fechado com diferença de ${formatCurrency(result.difference)} (esperado ${formatCurrency(result.expected)}).`,
    )
  } catch (error) {
    return fail(error)
  }
}

export async function addCashMovementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('cash.move')
  const parsed = cashMovementSchema.safeParse({
    type: text(formData, 'type') || 'OUT',
    method: text(formData, 'method') || 'CASH',
    amount: text(formData, 'amount') || 0,
    description: text(formData, 'description'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await addCashMovement(context.tenant.id, {
      ...parsed.data,
      userId: context.user.id,
    })
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: `cash.${parsed.data.type.toLowerCase()}`,
      entity: 'cash_movement',
      summary: `${parsed.data.description} · ${formatCurrency(parsed.data.amount)}`,
    })
    revalidatePath('/caixa')
    return ok('Movimentação registrada.')
  } catch (error) {
    return fail(error)
  }
}
