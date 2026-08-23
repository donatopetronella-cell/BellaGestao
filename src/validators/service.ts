import { z } from 'zod'
import { uuidSchema } from './common'

const optionalUuid = z
  .union([uuidSchema, z.literal('')])
  .optional()
  .transform((value) => (value ? value : null))

export const serviceCategorySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da categoria.').max(60),
})

export const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do serviço.').max(120),
  categoryId: optionalUuid,
  description: z.string().trim().max(500).optional().or(z.literal('')),
  durationMinutes: z.coerce
    .number()
    .int('Informe a duração em minutos.')
    .min(5, 'A duração mínima é de 5 minutos.')
    .max(600, 'A duração máxima é de 10 horas.'),
  price: z.coerce.number().min(0, 'Preço inválido.').max(1_000_000),
  cost: z.coerce.number().min(0, 'Custo inválido.').max(1_000_000).default(0),
  commissionKind: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
  commissionValue: z.coerce.number().min(0).max(1_000_000).default(0),
  isActive: z.boolean().default(true),
  professionalIds: z.array(uuidSchema).default([]),
})

export type ServiceInput = z.infer<typeof serviceSchema>

export const servicePriceSchema = z.object({
  serviceId: uuidSchema,
  professionalId: uuidSchema,
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(600).optional(),
  commissionValue: z.coerce.number().min(0).max(1_000_000).optional(),
})
