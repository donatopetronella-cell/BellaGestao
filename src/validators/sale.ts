import { z } from 'zod'
import { uuidSchema } from './common'

const optionalUuid = z
  .union([uuidSchema, z.literal('')])
  .optional()
  .transform((value) => (value ? value : null))

export const saleItemSchema = z.object({
  kind: z.enum(['PRODUCT', 'SERVICE']),
  itemId: uuidSchema,
  professionalId: optionalUuid,
  quantity: z.coerce.number().positive('Informe uma quantidade maior que zero.').default(1),
})

export const saleItemsSchema = z
  .array(saleItemSchema)
  .min(1, 'Adicione ao menos um item à venda.')

export const salePaymentSchema = z.object({
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
  amount: z.coerce.number().positive('Informe um valor maior que zero.'),
  installments: z.coerce.number().int().min(1).max(24).default(1),
})

export const salePaymentsSchema = z
  .array(salePaymentSchema)
  .min(1, 'Adicione ao menos uma forma de pagamento.')

export const createSaleSchema = z.object({
  clientId: optionalUuid,
  discount: z.coerce.number().min(0, 'Desconto inválido.').default(0),
  items: saleItemsSchema,
  payments: salePaymentsSchema,
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
