import 'server-only'
import { withContext } from '@/lib/db'
import { PLANS, planByCode } from '@/config/plans'

export interface PublicPlan {
  code: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number | null
  highlights: string[]
}

/**
 * Prices come from the `plans` table so they can be changed without a deploy;
 * the marketing copy (highlights) stays in the catalogue file.
 */
export async function listPublicPlans(): Promise<PublicPlan[]> {
  const rows = await withContext({}, (tx) =>
    tx.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        code: true,
        name: true,
        description: true,
        priceMonthly: true,
        priceYearly: true,
      },
    }),
  )

  if (rows.length === 0) {
    return PLANS.map((plan) => ({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      highlights: plan.highlights,
    }))
  }

  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    description: row.description ?? '',
    priceMonthly: Number(row.priceMonthly),
    priceYearly: row.priceYearly === null ? null : Number(row.priceYearly),
    highlights: planByCode(row.code)?.highlights ?? [],
  }))
}

export interface TenantSubscription {
  planCode: string
  planName: string
  status: string
  trialEndsAt: Date | null
  daysLeftInTrial: number | null
  features: string[]
}

export async function getTenantSubscription(
  tenantId: string,
): Promise<TenantSubscription | null> {
  const subscription = await withContext({ tenantId }, (tx) =>
    tx.subscription.findUnique({
      where: { tenantId },
      select: {
        status: true,
        trialEndsAt: true,
        plan: { select: { code: true, name: true, features: true } },
      },
    }),
  )

  if (!subscription) return null

  const trialEndsAt = subscription.trialEndsAt
  const daysLeftInTrial = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      )
    : null

  return {
    planCode: subscription.plan.code,
    planName: subscription.plan.name,
    status: subscription.status,
    trialEndsAt,
    daysLeftInTrial,
    features: Array.isArray(subscription.plan.features)
      ? (subscription.plan.features as string[])
      : [],
  }
}
