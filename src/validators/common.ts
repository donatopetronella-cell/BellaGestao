import { z } from 'zod'

export const uuidSchema = z.string().uuid('Identificador inválido.')

export const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Informe um telefone válido com DDD.')
  .max(20, 'Telefone muito longo.')
  .regex(/^[0-9()+\-\s]+$/, 'Telefone inválido.')

export const optionalPhoneSchema = z
  .union([phoneSchema, z.literal('')])
  .optional()
  .transform((value) => (value ? value : undefined))

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Informe um e-mail válido.')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})

export type Pagination = z.infer<typeof paginationSchema>
