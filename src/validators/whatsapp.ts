import { z } from 'zod'
import { uuidSchema } from './common'

export const whatsappTemplateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Informe um código.')
    .max(60)
    .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e sublinhado.'),
  name: z.string().trim().min(2, 'Informe um nome.').max(120),
  category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']).default('UTILITY'),
  body: z.string().trim().min(5, 'Escreva o texto da mensagem.').max(1000),
  isActive: z.boolean().default(true),
})

export type WhatsappTemplateInput = z.infer<typeof whatsappTemplateSchema>

export const sendWhatsappMessageSchema = z.object({
  clientId: uuidSchema,
  templateId: uuidSchema,
})

export type SendWhatsappMessageInput = z.infer<typeof sendWhatsappMessageSchema>
