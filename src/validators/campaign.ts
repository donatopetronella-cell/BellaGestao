import { z } from 'zod'
import { uuidSchema } from './common'

export const campaignSchema = z.object({
  name: z.string().trim().min(2, 'Informe um nome.').max(120),
  type: z.enum(['REACTIVATION', 'BIRTHDAY', 'PROMOTION', 'REMINDER', 'CUSTOM']).default('CUSTOM'),
  templateId: uuidSchema,
  inactiveDays: z.coerce.number().int().min(0).optional(),
  birthdayMonth: z.coerce.number().int().min(1).max(12).optional(),
})

export type CampaignInput = z.infer<typeof campaignSchema>
