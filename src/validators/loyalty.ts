import { z } from 'zod'
import { uuidSchema } from './common'

export const loyaltyProgramSchema = z.object({
  mode: z.enum(['POINTS', 'CASHBACK', 'VISITS']).default('POINTS'),
  pointsPerCurrency: z.coerce.number().min(0).default(1),
  currencyPerPoint: z.coerce.number().min(0).default(0.06),
  minRedeemPoints: z.coerce.number().int().min(0).default(500),
  cashbackPercent: z.coerce.number().min(0).max(100).default(0),
  visitsForReward: z.coerce.number().int().min(1).default(10),
  rewardDescription: z.string().trim().max(300).optional().or(z.literal('')),
  isActive: z.boolean().default(false),
})

export type LoyaltyProgramInput = z.infer<typeof loyaltyProgramSchema>

export const loyaltyAdjustSchema = z.object({
  clientId: uuidSchema,
  type: z.enum(['EARN', 'REDEEM', 'ADJUST']),
  points: z.coerce.number().int().default(0),
  amount: z.coerce.number().default(0),
  description: z.string().trim().max(200).optional().or(z.literal('')),
})

export type LoyaltyAdjustInput = z.infer<typeof loyaltyAdjustSchema>
