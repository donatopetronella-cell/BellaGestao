import { z } from 'zod'
import { PLAN_FEATURES } from '@/config/plans'
import { uuidSchema } from './common'

export const planEditSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(2, 'Informe um nome.').max(80),
  description: z.string().trim().max(280).optional(),
  priceMonthly: z.coerce.number().min(0, 'Preço inválido.'),
  priceYearly: z.coerce.number().min(0).optional(),
  trialDays: z.coerce.number().int().min(0).max(90),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  features: z.array(z.enum(PLAN_FEATURES)),
  limitBranches: z.coerce.number().int().min(0),
  limitProfessionals: z.coerce.number().int().min(0),
  limitUsers: z.coerce.number().int().min(0),
  limitWhatsappMessagesPerMonth: z.coerce.number().int().min(0),
  limitAiQuestionsPerMonth: z.coerce.number().int().min(0),
})

export type PlanEditInput = z.infer<typeof planEditSchema>

export const subscriptionOverrideSchema = z.object({
  tenantId: uuidSchema,
  status: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED']),
  note: z.string().trim().max(280).optional(),
})

export type SubscriptionOverrideInput = z.infer<typeof subscriptionOverrideSchema>
