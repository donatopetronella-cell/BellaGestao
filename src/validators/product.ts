import { z } from 'zod'
import { uuidSchema } from './common'

const optionalUuid = z
  .union([uuidSchema, z.literal('')])
  .optional()
  .transform((value) => (value ? value : null))

export const productCategorySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da categoria.').max(60),
})

export const supplierSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do fornecedor.').max(120),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')),
  document: z.string().trim().max(30).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do produto.').max(120),
  categoryId: optionalUuid,
  supplierId: optionalUuid,
  brand: z.string().trim().max(60).optional().or(z.literal('')),
  sku: z.string().trim().max(60).optional().or(z.literal('')),
  barcode: z.string().trim().max(60).optional().or(z.literal('')),
  unit: z.string().trim().min(1).max(10).default('un'),
  cost: z.coerce.number().min(0, 'Custo inválido.').max(1_000_000).default(0),
  price: z.coerce.number().min(0, 'Preço inválido.').max(1_000_000),
  minStock: z.coerce.number().min(0, 'Estoque mínimo inválido.').max(1_000_000).default(0),
  isForSale: z.boolean().default(true),
  isSupply: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export type ProductInput = z.infer<typeof productSchema>

export const stockAdjustmentSchema = z.object({
  productId: uuidSchema,
  type: z.enum(['PURCHASE', 'ADJUSTMENT', 'LOSS', 'RETURN']),
  quantity: z.coerce.number().positive('Informe uma quantidade maior que zero.'),
  unitCost: z.coerce.number().min(0).max(1_000_000).optional(),
  reason: z.string().trim().max(300).optional().or(z.literal('')),
})

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
