'use server'

import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import { createCheckoutSession } from '@/features/billing/service'
import { checkoutSchema } from '@/validators/billing'
import type { FormState } from './types'
import { fail, fromZod, text } from './form'

export async function startCheckoutAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requirePermission('billing.manage')
  const parsed = checkoutSchema.safeParse({
    planCode: text(formData, 'planCode'),
    billingCycle: text(formData, 'billingCycle') || 'monthly',
  })
  if (!parsed.success) return fromZod(parsed.error)

  let checkoutUrl: string
  try {
    const result = await createCheckoutSession(context.tenant.id, parsed.data, context.user.email)
    checkoutUrl = result.checkoutUrl
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'billing.checkout_started',
      entity: 'subscription',
      summary: `Checkout iniciado: plano ${parsed.data.planCode} (${parsed.data.billingCycle})`,
    })
  } catch (error) {
    return fail(error)
  }

  redirect(checkoutUrl)
}
