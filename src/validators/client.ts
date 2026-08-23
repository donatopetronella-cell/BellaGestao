import { z } from 'zod'
import { optionalPhoneSchema, uuidSchema } from './common'

const optionalUuid = z
  .union([uuidSchema, z.literal('')])
  .optional()
  .transform((value) => (value ? value : null))

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'), z.literal('')])
  .optional()
  .transform((value) => (value ? new Date(`${value}T12:00:00.000Z`) : null))

export const clientSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da cliente.').max(120),
  phone: optionalPhoneSchema,
  whatsapp: optionalPhoneSchema,
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')),
  document: z.string().trim().max(20).optional().or(z.literal('')),
  birthDate: optionalDate,
  zipCode: z.string().trim().max(12).optional().or(z.literal('')),
  street: z.string().trim().max(160).optional().or(z.literal('')),
  number: z.string().trim().max(20).optional().or(z.literal('')),
  complement: z.string().trim().max(80).optional().or(z.literal('')),
  district: z.string().trim().max(80).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  state: z.string().trim().max(2).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  preferences: z.string().trim().max(1000).optional().or(z.literal('')),
  allergies: z.string().trim().max(1000).optional().or(z.literal('')),
  source: z.string().trim().max(60).optional().or(z.literal('')),
  preferredProfessionalId: optionalUuid,
  marketingConsent: z.boolean().default(false),
})

export type ClientInput = z.infer<typeof clientSchema>

export const hairProfileSchema = z.object({
  hairType: z.string().trim().max(60).optional().or(z.literal('')),
  length: z.string().trim().max(60).optional().or(z.literal('')),
  curvature: z.string().trim().max(60).optional().or(z.literal('')),
  texture: z.string().trim().max(60).optional().or(z.literal('')),
  condition: z.string().trim().max(120).optional().or(z.literal('')),
  scalp: z.string().trim().max(120).optional().or(z.literal('')),
  previousProcedures: z.string().trim().max(1000).optional().or(z.literal('')),
  allergies: z.string().trim().max(1000).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
})

export type HairProfileInput = z.infer<typeof hairProfileSchema>

export const formulaItemSchema = z.object({
  tone: z.string().trim().min(1, 'Informe a tonalidade.').max(30),
  grams: z.coerce.number().min(0).max(10_000),
})

export const chemicalRecordSchema = z.object({
  procedure: z.enum([
    'COLORING',
    'BLEACHING',
    'PROGRESSIVE',
    'RELAXING',
    'BOTOX',
    'TONING',
    'RECONSTRUCTION',
    'OTHER',
  ]),
  professionalId: optionalUuid,
  brand: z.string().trim().max(60).optional().or(z.literal('')),
  productName: z.string().trim().max(120).optional().or(z.literal('')),
  items: z.array(formulaItemSchema).max(10).default([]),
  oxidantVolume: z.coerce.number().int().min(0).max(60).optional(),
  oxidantMl: z.coerce.number().int().min(0).max(5000).optional(),
  pauseMinutes: z.coerce.number().int().min(0).max(300).optional(),
  result: z.string().trim().max(500).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  performedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
    .transform((value) => new Date(`${value}T12:00:00.000Z`)),
  saveAsFormula: z.boolean().default(false),
  formulaName: z.string().trim().max(80).optional().or(z.literal('')),
})

export type ChemicalRecordInput = z.infer<typeof chemicalRecordSchema>

export const PROCEDURE_LABELS: Record<ChemicalRecordInput['procedure'], string> = {
  COLORING: 'Coloração',
  BLEACHING: 'Descoloração',
  PROGRESSIVE: 'Progressiva',
  RELAXING: 'Relaxamento',
  BOTOX: 'Botox',
  TONING: 'Tonalização',
  RECONSTRUCTION: 'Reconstrução',
  OTHER: 'Outro',
}

export const clientPhotoSchema = z.object({
  kind: z.enum(['BEFORE', 'AFTER', 'OTHER']).default('OTHER'),
  caption: z.string().trim().max(200).optional().or(z.literal('')),
})

export const clientImportRowSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto.').max(120),
  phone: z.string().trim().max(20).optional(),
  email: z
    .string()
    .trim()
    .email('E-mail inválido.')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined)),
  birthDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
})
