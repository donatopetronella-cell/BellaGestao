import { z } from 'zod'
import { uuidSchema } from './common'

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido.')

export const appointmentSchema = z.object({
  clientId: uuidSchema,
  professionalId: uuidSchema,
  date: dateKeySchema,
  time: timeSchema,
  serviceIds: z
    .array(uuidSchema)
    .min(1, 'Selecione pelo menos um serviço.')
    .max(10, 'Máximo de 10 serviços por atendimento.'),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  source: z.enum(['INTERNAL', 'ONLINE', 'WHATSAPP', 'IMPORT']).default('INTERNAL'),
})

export type AppointmentInput = z.infer<typeof appointmentSchema>

export const rescheduleSchema = z.object({
  appointmentId: uuidSchema,
  date: dateKeySchema,
  time: timeSchema,
  professionalId: uuidSchema,
})

export const appointmentStatusSchema = z.object({
  appointmentId: uuidSchema,
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'ARRIVED',
    'IN_SERVICE',
    'FINISHED',
    'CANCELED',
    'NO_SHOW',
  ]),
  reason: z.string().trim().max(300).optional().or(z.literal('')),
})

export const finishAppointmentSchema = z.object({
  appointmentId: uuidSchema,
  discount: z.coerce.number().min(0).max(1_000_000).default(0),
  payments: z
    .array(
      z.object({
        method: z.enum([
          'CASH',
          'PIX',
          'DEBIT_CARD',
          'CREDIT_CARD',
          'TRANSFER',
          'INSTALLMENT',
          'LOYALTY',
          'OTHER',
        ]),
        amount: z.coerce.number().min(0.01, 'Informe o valor recebido.'),
        installments: z.coerce.number().int().min(1).max(24).default(1),
      }),
    )
    .min(1, 'Informe ao menos uma forma de pagamento.')
    .max(4),
})

export type FinishAppointmentInput = z.infer<typeof finishAppointmentSchema>
