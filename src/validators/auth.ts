import { z } from 'zod'
import { emailSchema, optionalPhoneSchema } from './common'

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(72, 'A senha deve ter no máximo 72 caracteres.')
  .regex(/[A-Za-zÀ-ÿ]/, 'A senha deve conter pelo menos uma letra.')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número.')

export const registerSchema = z.object({
  salonName: z
    .string()
    .trim()
    .min(2, 'Informe o nome do seu salão.')
    .max(120, 'Nome muito longo.'),
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome.')
    .max(120, 'Nome muito longo.'),
  email: emailSchema,
  phone: optionalPhoneSchema,
  password: passwordSchema,
  planCode: z.enum(['essencial', 'profissional', 'premium']).default('profissional'),
  acceptTerms: z.literal(true, {
    message: 'É necessário aceitar os termos de uso.',
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, 'Link inválido.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  })
