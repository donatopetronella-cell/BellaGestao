'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  createExpense,
  createFinancialCategory,
  createRevenue,
  deleteExpense,
  deleteRevenue,
  settleExpense,
  settleRevenue,
} from '@/features/finance/service'
import { expenseSchema, financialCategorySchema, revenueSchema } from '@/validators/finance'
import { uuidSchema } from '@/validators/common'
import type { FormState } from './types'
import { checkbox, fail, fromZod, ok, text } from './form'

export async function createFinancialCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('finance.manage')
  const parsed = financialCategorySchema.safeParse({
    name: text(formData, 'name'),
    kind: text(formData, 'kind'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createFinancialCategory(context.tenant.id, parsed.data)
    revalidatePath('/financeiro')
    return ok('Categoria criada.', { id })
  } catch (error) {
    return fail(error)
  }
}

export async function createRevenueAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('finance.manage')
  const parsed = revenueSchema.safeParse({
    description: text(formData, 'description'),
    categoryId: text(formData, 'categoryId'),
    amount: text(formData, 'amount'),
    method: text(formData, 'method'),
    status: text(formData, 'status') || 'SETTLED',
    dueDate: text(formData, 'dueDate'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createRevenue(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'revenue.created',
      entity: 'revenue',
      entityId: id,
      summary: `Receita lançada: ${parsed.data.description}`,
    })
    revalidatePath('/financeiro')
    return ok('Receita lançada.', { id })
  } catch (error) {
    return fail(error)
  }
}

export async function settleRevenueAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('finance.manage')
  const revenueId = uuidSchema.safeParse(text(formData, 'revenueId'))
  if (!revenueId.success) return fail(revenueId.error)

  try {
    await settleRevenue(context.tenant.id, revenueId.data)
    revalidatePath('/financeiro')
    return ok('Receita recebida.')
  } catch (error) {
    return fail(error)
  }
}

export async function deleteRevenueAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('finance.manage')
  const revenueId = uuidSchema.safeParse(text(formData, 'revenueId'))
  if (!revenueId.success) return fail(revenueId.error)

  try {
    await deleteRevenue(context.tenant.id, revenueId.data)
    revalidatePath('/financeiro')
    return ok('Receita removida.')
  } catch (error) {
    return fail(error)
  }
}

export async function createExpenseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('finance.manage')
  const parsed = expenseSchema.safeParse({
    description: text(formData, 'description'),
    categoryId: text(formData, 'categoryId'),
    supplierId: text(formData, 'supplierId'),
    amount: text(formData, 'amount'),
    method: text(formData, 'method'),
    status: text(formData, 'status') || 'PENDING',
    dueDate: text(formData, 'dueDate'),
    isRecurring: checkbox(formData, 'isRecurring'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createExpense(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'expense.created',
      entity: 'expense',
      entityId: id,
      summary: `Despesa lançada: ${parsed.data.description}`,
    })
    revalidatePath('/financeiro')
    return ok('Despesa lançada.', { id })
  } catch (error) {
    return fail(error)
  }
}

export async function settleExpenseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('finance.manage')
  const expenseId = uuidSchema.safeParse(text(formData, 'expenseId'))
  if (!expenseId.success) return fail(expenseId.error)

  try {
    await settleExpense(context.tenant.id, expenseId.data)
    revalidatePath('/financeiro')
    return ok('Despesa paga.')
  } catch (error) {
    return fail(error)
  }
}

export async function deleteExpenseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('finance.manage')
  const expenseId = uuidSchema.safeParse(text(formData, 'expenseId'))
  if (!expenseId.success) return fail(expenseId.error)

  try {
    await deleteExpense(context.tenant.id, expenseId.data)
    revalidatePath('/financeiro')
    return ok('Despesa removida.')
  } catch (error) {
    return fail(error)
  }
}
