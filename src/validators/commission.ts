import { z } from 'zod'
import { uuidSchema } from './common'

const optionalUuid = z
  .union([uuidSchema, z.literal('')])
  .optional()
  .transform((value) => (value ? value : null))

export const commissionRuleSchema = z.object({
  professionalId: optionalUuid,
  productId: optionalUuid,
  appliesTo: z.enum(['SERVICE', 'PRODUCT', 'ALL']).default('PRODUCT'),
  kind: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
  value: z.coerce.number().min(0, 'Valor inválido.').max(1_000_000),
  priority: z.coerce.number().int().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
})

export type CommissionRuleInput = z.infer<typeof commissionRuleSchema>

export const commissionMonthSchema = z.object({
  professionalId: optionalUuid,
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Informe o mês no formato AAAA-MM.'),
})

export const commissionBulkActionSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'Selecione ao menos uma comissão.'),
})
