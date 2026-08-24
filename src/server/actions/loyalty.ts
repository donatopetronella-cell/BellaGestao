'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import { adjustLoyaltyAccount, saveLoyaltyProgram } from '@/features/loyalty/service'
import { loyaltyAdjustSchema, loyaltyProgramSchema } from '@/validators/loyalty'
import type { FormState } from './types'
import { checkbox, fail, fromZod, ok, text } from './form'

export async function saveLoyaltyProgramAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('loyalty.manage')
  const parsed = loyaltyProgramSchema.safeParse({
    mode: text(formData, 'mode') || 'POINTS',
    pointsPerCurrency: text(formData, 'pointsPerCurrency') || 1,
    currencyPerPoint: text(formData, 'currencyPerPoint') || 0.06,
    minRedeemPoints: text(formData, 'minRedeemPoints') || 500,
    cashbackPercent: text(formData, 'cashbackPercent') || 0,
    visitsForReward: text(formData, 'visitsForReward') || 10,
    rewardDescription: text(formData, 'rewardDescription'),
    isActive: checkbox(formData, 'isActive'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await saveLoyaltyProgram(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'loyalty_program.saved',
      entity: 'loyalty_program',
      summary: `Programa de fidelidade: ${parsed.data.isActive ? 'ativo' : 'inativo'}`,
    })
    revalidatePath('/fidelidade')
    return ok('Programa salvo.')
  } catch (error) {
    return fail(error)
  }
}

export async function adjustLoyaltyAccountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('loyalty.manage')
  const parsed = loyaltyAdjustSchema.safeParse({
    clientId: text(formData, 'clientId'),
    type: text(formData, 'type'),
    points: text(formData, 'points') || 0,
    amount: text(formData, 'amount') || 0,
    description: text(formData, 'description'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await adjustLoyaltyAccount(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'loyalty_account.adjusted',
      entity: 'loyalty_account',
      summary: `${parsed.data.type}: ${parsed.data.points} pontos`,
    })
    revalidatePath('/fidelidade')
    return ok('Lançamento registrado.')
  } catch (error) {
    return fail(error)
  }
}
