'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  approveCommissions,
  createCommissionRule,
  deleteCommissionRule,
  markCommissionsPaid,
  updateCommissionRule,
} from '@/features/commissions/service'
import { commissionBulkActionSchema, commissionRuleSchema } from '@/validators/commission'
import { uuidSchema } from '@/validators/common'
import type { FormState } from './types'
import { checkbox, fail, fromZod, ok, text, textList } from './form'

function readRuleForm(formData: FormData) {
  return commissionRuleSchema.safeParse({
    professionalId: text(formData, 'professionalId'),
    productId: text(formData, 'productId'),
    appliesTo: text(formData, 'appliesTo') || 'PRODUCT',
    kind: text(formData, 'kind') || 'PERCENT',
    value: text(formData, 'value'),
    priority: text(formData, 'priority') || 0,
    isActive: checkbox(formData, 'isActive'),
  })
}

export async function createCommissionRuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('commissions.manage')
  const parsed = readRuleForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createCommissionRule(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'commission_rule.created',
      entity: 'commission_rule',
      entityId: id,
    })
    revalidatePath('/comissoes')
    return ok('Regra de comissão criada.', { id })
  } catch (error) {
    return fail(error)
  }
}

export async function updateCommissionRuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('commissions.manage')
  const ruleId = uuidSchema.safeParse(text(formData, 'ruleId'))
  if (!ruleId.success) return fail(ruleId.error)

  const parsed = readRuleForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await updateCommissionRule(context.tenant.id, ruleId.data, parsed.data)
    revalidatePath('/comissoes')
    return ok('Regra de comissão atualizada.')
  } catch (error) {
    return fail(error)
  }
}

export async function deleteCommissionRuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('commissions.manage')
  const ruleId = uuidSchema.safeParse(text(formData, 'ruleId'))
  if (!ruleId.success) return fail(ruleId.error)

  try {
    await deleteCommissionRule(context.tenant.id, ruleId.data)
    revalidatePath('/comissoes')
    return ok('Regra de comissão removida.')
  } catch (error) {
    return fail(error)
  }
}

export async function approveCommissionsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('commissions.manage')
  const parsed = commissionBulkActionSchema.safeParse({ ids: textList(formData, 'ids') })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await approveCommissions(context.tenant.id, parsed.data.ids)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'commissions.approved',
      entity: 'commission',
      summary: `${parsed.data.ids.length} comissão(ões) aprovada(s)`,
    })
    revalidatePath('/comissoes')
    return ok('Comissões aprovadas.')
  } catch (error) {
    return fail(error)
  }
}

export async function markCommissionsPaidAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('commissions.manage')
  const parsed = commissionBulkActionSchema.safeParse({ ids: textList(formData, 'ids') })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await markCommissionsPaid(context.tenant.id, parsed.data.ids)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'commissions.paid',
      entity: 'commission',
      summary: `${parsed.data.ids.length} comissão(ões) paga(s)`,
    })
    revalidatePath('/comissoes')
    return ok('Comissões marcadas como pagas.')
  } catch (error) {
    return fail(error)
  }
}
