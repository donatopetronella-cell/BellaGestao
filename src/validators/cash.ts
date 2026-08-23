import { z } from 'zod'
import { uuidSchema } from './common'

export const openRegisterSchema = z.object({
  openingAmount: z.coerce
    .number()
    .min(0, 'Informe o valor inicial do caixa.')
    .max(1_000_000),
  notes: z.string().trim().max(300).optional().or(z.literal('')),
})

export const closeRegisterSchema = z.object({
  registerId: uuidSchema,
  closingAmount: z.coerce
    .number()
    .min(0, 'Informe o valor contado no fechamento.')
    .max(1_000_000),
  notes: z.string().trim().max(300).optional().or(z.literal('')),
})

export const cashMovementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'WITHDRAWAL', 'REINFORCEMENT']),
  method: z
    .enum([
      'CASH',
      'PIX',
      'DEBIT_CARD',
      'CREDIT_CARD',
      'TRANSFER',
      'INSTALLMENT',
      'LOYALTY',
      'OTHER',
    ])
    .default('CASH'),
  amount: z.coerce.number().min(0.01, 'Informe o valor.').max(1_000_000),
  description: z.string().trim().min(2, 'Descreva a movimentação.').max(200),
})

export const PAYMENT_METHOD_LABELS = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  DEBIT_CARD: 'Cartão de débito',
  CREDIT_CARD: 'Cartão de crédito',
  TRANSFER: 'Transferência',
  INSTALLMENT: 'Parcelado',
  LOYALTY: 'Fidelidade',
  OTHER: 'Outro',
} as const

export const CASH_MOVEMENT_LABELS = {
  SALE: 'Venda',
  IN: 'Entrada',
  OUT: 'Saída',
  WITHDRAWAL: 'Sangria',
  REINFORCEMENT: 'Reforço',
} as const
