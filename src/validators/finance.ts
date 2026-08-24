import { z } from 'zod'
import { uuidSchema } from './common'

const optionalUuid = z
  .union([uuidSchema, z.literal('')])
  .optional()
  .transform((value) => (value ? value : null))

const optionalDate = z
  .union([z.string().min(1), z.literal('')])
  .optional()
  .transform((value) => (value ? new Date(value) : null))

export const financialCategorySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da categoria.').max(60),
  kind: z.enum(['REVENUE', 'EXPENSE']),
})

const paymentMethodEnum = z.enum([
  'CASH',
  'PIX',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'TRANSFER',
  'INSTALLMENT',
  'LOYALTY',
  'OTHER',
])

export const revenueSchema = z.object({
  description: z.string().trim().min(2, 'Informe a descrição.').max(200),
  categoryId: optionalUuid,
  amount: z.coerce.number().positive('Informe um valor maior que zero.').max(10_000_000),
  method: z.union([paymentMethodEnum, z.literal('')]).optional().transform((v) => (v ? v : null)),
  status: z.enum(['PENDING', 'SETTLED']).default('SETTLED'),
  dueDate: optionalDate,
})

export type RevenueInput = z.infer<typeof revenueSchema>

export const expenseSchema = z.object({
  description: z.string().trim().min(2, 'Informe a descrição.').max(200),
  categoryId: optionalUuid,
  supplierId: optionalUuid,
  amount: z.coerce.number().positive('Informe um valor maior que zero.').max(10_000_000),
  method: z.union([paymentMethodEnum, z.literal('')]).optional().transform((v) => (v ? v : null)),
  status: z.enum(['PENDING', 'SETTLED']).default('PENDING'),
  dueDate: optionalDate,
  isRecurring: z.boolean().default(false),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
