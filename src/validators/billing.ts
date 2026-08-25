import { z } from 'zod'

export const checkoutSchema = z.object({
  planCode: z.string().min(1, 'Selecione um plano.'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
