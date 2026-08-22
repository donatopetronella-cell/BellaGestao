import { z } from 'zod'
import { optionalPhoneSchema } from './common'

export const tenantProfileSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do salão.').max(120),
  legalName: z.string().trim().max(160).optional().or(z.literal('')),
  document: z.string().trim().max(20).optional().or(z.literal('')),
  phone: optionalPhoneSchema,
  whatsapp: optionalPhoneSchema,
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')),
  timezone: z.string().min(3).default('America/Sao_Paulo'),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
})

export const tenantSettingsSchema = z.object({
  appointmentIntervalMin: z.coerce.number().int().min(5).max(120).default(15),
  cancellationPolicyHours: z.coerce.number().int().min(0).max(168).default(24),
  cancellationPolicyText: z.string().trim().max(500).optional().or(z.literal('')),
  monthlyRevenueGoal: z.coerce.number().min(0).max(10_000_000).optional(),
  reminder24hEnabled: z.boolean().default(true),
  reminder2hEnabled: z.boolean().default(true),
})

export const salonSetupSchema = tenantProfileSchema.merge(tenantSettingsSchema)

export type SalonSetupInput = z.infer<typeof salonSetupSchema>

export const openingHourSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  isClosed: z.boolean().default(false),
  startMin: z.coerce.number().int().min(0).max(1439),
  endMin: z.coerce.number().int().min(1).max(1440),
})

export const openingHoursSchema = z
  .array(openingHourSchema)
  .length(7, 'Informe os sete dias da semana.')
  .refine(
    (days) => days.every((day) => day.isClosed || day.endMin > day.startMin),
    { message: 'O horário de fechamento deve ser maior que o de abertura.' },
  )
