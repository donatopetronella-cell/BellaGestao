'use server'

import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import { getAdminDb } from '@/lib/db'
import { notFound } from '@/lib/errors'
import { planEditSchema, subscriptionOverrideSchema } from '@/validators/admin-billing'
import type { FormState } from './types'
import { checkbox, fail, fromZod, ok, text, textList } from './form'

/**
 * Platform-admin mutations. Deliberately not `requirePermission` — these are
 * cross-tenant operations gated by `User.isPlatformAdmin`, not the per-tenant
 * RBAC matrix, and they use `getAdminDb()` directly (schema owner, bypasses
 * RLS) since they are not scoped to the acting admin's own tenant.
 */
export async function updatePlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformAdmin()

  const parsed = planEditSchema.safeParse({
    id: text(formData, 'id'),
    name: text(formData, 'name'),
    description: text(formData, 'description') || undefined,
    priceMonthly: text(formData, 'priceMonthly'),
    priceYearly: text(formData, 'priceYearly') || undefined,
    trialDays: text(formData, 'trialDays'),
    sortOrder: text(formData, 'sortOrder'),
    isActive: checkbox(formData, 'isActive'),
    features: textList(formData, 'features'),
    limitBranches: text(formData, 'limitBranches'),
    limitProfessionals: text(formData, 'limitProfessionals'),
    limitUsers: text(formData, 'limitUsers'),
    limitWhatsappMessagesPerMonth: text(formData, 'limitWhatsappMessagesPerMonth'),
    limitAiQuestionsPerMonth: text(formData, 'limitAiQuestionsPerMonth'),
  })
  if (!parsed.success) return fromZod(parsed.error)
  const input = parsed.data

  try {
    await getAdminDb().plan.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description ?? null,
        priceMonthly: input.priceMonthly,
        priceYearly: input.priceYearly ?? null,
        trialDays: input.trialDays,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        features: input.features,
        limits: {
          branches: input.limitBranches,
          professionals: input.limitProfessionals,
          users: input.limitUsers,
          whatsappMessagesPerMonth: input.limitWhatsappMessagesPerMonth,
          aiQuestionsPerMonth: input.limitAiQuestionsPerMonth,
        },
      },
    })
    revalidatePath('/admin/plans')
    revalidatePath(`/admin/plans/${input.id}`)
    return ok('Plano atualizado.')
  } catch (error) {
    return fail(error)
  }
}

export async function overrideSubscriptionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requirePlatformAdmin()

  const parsed = subscriptionOverrideSchema.safeParse({
    tenantId: text(formData, 'tenantId'),
    status: text(formData, 'status'),
    note: text(formData, 'note') || undefined,
  })
  if (!parsed.success) return fromZod(parsed.error)
  const input = parsed.data

  try {
    const adminDb = getAdminDb()
    const subscription = await adminDb.subscription.findUnique({ where: { tenantId: input.tenantId } })
    if (!subscription) throw notFound('Assinatura não encontrada.')

    await adminDb.subscription.update({
      where: { tenantId: input.tenantId },
      data: { status: input.status, provider: 'MANUAL' },
    })
    await adminDb.tenant.update({ where: { id: input.tenantId }, data: { status: input.status } })

    await writeAudit({
      tenantId: input.tenantId,
      userId: admin.user.id,
      userName: `[admin] ${admin.user.name}`,
      action: 'billing.subscription_overridden',
      entity: 'subscription',
      summary: `Status alterado manualmente para ${input.status}${input.note ? ` — ${input.note}` : ''}`,
    })

    revalidatePath(`/admin/tenants/${input.tenantId}`)
    return ok('Assinatura atualizada.')
  } catch (error) {
    return fail(error)
  }
}
