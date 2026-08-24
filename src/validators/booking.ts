import { z } from 'zod'
import { phoneSchema, uuidSchema } from './common'

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido.')

export const publicBookingSchema = z.object({
  tenantId: uuidSchema,
  serviceId: uuidSchema,
  professionalId: uuidSchema,
  date: dateKeySchema,
  time: timeSchema,
  clientName: z.string().trim().min(2, 'Informe seu nome.').max(120),
  clientPhone: phoneSchema,
  notes: z.string().trim().max(300).optional().or(z.literal('')),
})

export type PublicBookingInput = z.infer<typeof publicBookingSchema>
