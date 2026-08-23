import { z } from 'zod'
import { optionalPhoneSchema } from './common'

export const professionalSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.').max(120),
  specialty: z.string().trim().max(80).optional().or(z.literal('')),
  phone: optionalPhoneSchema,
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.')
    .optional()
    .or(z.literal('')),
  commissionPercent: z.coerce
    .number()
    .min(0, 'A comissão não pode ser negativa.')
    .max(100, 'A comissão não pode passar de 100%.')
    .default(0),
  isActive: z.boolean().default(true),
})

export type ProfessionalInput = z.infer<typeof professionalSchema>

export const workingHourSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    isWorking: z.boolean().default(true),
    startMin: z.coerce.number().int().min(0).max(1439),
    endMin: z.coerce.number().int().min(1).max(1440),
    breakStartMin: z.coerce.number().int().min(0).max(1440).nullable().optional(),
    breakEndMin: z.coerce.number().int().min(0).max(1440).nullable().optional(),
  })
  .refine((day) => !day.isWorking || day.endMin > day.startMin, {
    message: 'O fim do expediente deve ser depois do início.',
  })
  .refine(
    (day) =>
      !day.breakStartMin ||
      !day.breakEndMin ||
      day.breakEndMin > day.breakStartMin,
    { message: 'O fim do intervalo deve ser depois do início.' },
  )

export const workingHoursSchema = z.array(workingHourSchema).length(7)
