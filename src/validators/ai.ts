import { z } from 'zod'

export const askBellaIaSchema = z.object({
  question: z.string().trim().min(3, 'Escreva sua pergunta.').max(500),
})

export type AskBellaIaInput = z.infer<typeof askBellaIaSchema>
