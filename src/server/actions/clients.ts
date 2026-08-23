'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  anonymizeClient,
  createChemicalRecord,
  createClient,
  deleteClientPhoto,
  registerClientPhoto,
  saveHairProfile,
  updateClient,
} from '@/features/clients/service'
import { importClients } from '@/features/clients/import-service'
import { parseClientsCsv } from '@/features/clients/import'
import { getStorage, storeClientPhoto } from '@/lib/storage'
import {
  chemicalRecordSchema,
  clientPhotoSchema,
  clientSchema,
  hairProfileSchema,
} from '@/validators/client'
import { uuidSchema } from '@/validators/common'
import type { FormState } from './types'
import {
  checkbox,
  fail,
  fromZod,
  numberOrUndefined,
  ok,
  text,
  textList,
} from './form'

function readClientForm(formData: FormData) {
  return clientSchema.safeParse({
    name: text(formData, 'name'),
    phone: text(formData, 'phone'),
    whatsapp: text(formData, 'whatsapp'),
    email: text(formData, 'email'),
    document: text(formData, 'document'),
    birthDate: text(formData, 'birthDate'),
    zipCode: text(formData, 'zipCode'),
    street: text(formData, 'street'),
    number: text(formData, 'number'),
    complement: text(formData, 'complement'),
    district: text(formData, 'district'),
    city: text(formData, 'city'),
    state: text(formData, 'state'),
    notes: text(formData, 'notes'),
    preferences: text(formData, 'preferences'),
    allergies: text(formData, 'allergies'),
    source: text(formData, 'source'),
    preferredProfessionalId: text(formData, 'preferredProfessionalId'),
    marketingConsent: checkbox(formData, 'marketingConsent'),
  })
}

export async function createClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('clients.create')
  const parsed = readClientForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const clientId = await createClient(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'client.created',
      entity: 'client',
      entityId: clientId,
      summary: `Cliente cadastrada: ${parsed.data.name}`,
    })
    revalidatePath('/clientes')
    return ok('Cliente cadastrada.', { id: clientId })
  } catch (error) {
    return fail(error)
  }
}

export async function updateClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('clients.update')
  const clientId = uuidSchema.safeParse(text(formData, 'clientId'))
  if (!clientId.success) return fail(clientId.error)

  const parsed = readClientForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await updateClient(context.tenant.id, clientId.data, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'client.updated',
      entity: 'client',
      entityId: clientId.data,
      summary: `Cliente atualizada: ${parsed.data.name}`,
    })
    revalidatePath('/clientes')
    revalidatePath(`/clientes/${clientId.data}`)
    return ok('Dados atualizados.')
  } catch (error) {
    return fail(error)
  }
}

export async function anonymizeClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('clients.delete')
  const clientId = uuidSchema.safeParse(text(formData, 'clientId'))
  if (!clientId.success) return fail(clientId.error)

  try {
    await anonymizeClient(context.tenant.id, clientId.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'client.anonymized',
      entity: 'client',
      entityId: clientId.data,
      summary: 'Dados pessoais anonimizados (LGPD)',
    })
    revalidatePath('/clientes')
    return ok('Dados pessoais anonimizados.')
  } catch (error) {
    return fail(error)
  }
}

export async function saveHairProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('clients.hair_record.manage')
  const clientId = uuidSchema.safeParse(text(formData, 'clientId'))
  if (!clientId.success) return fail(clientId.error)

  const parsed = hairProfileSchema.safeParse({
    hairType: text(formData, 'hairType'),
    length: text(formData, 'length'),
    curvature: text(formData, 'curvature'),
    texture: text(formData, 'texture'),
    condition: text(formData, 'condition'),
    scalp: text(formData, 'scalp'),
    previousProcedures: text(formData, 'previousProcedures'),
    allergies: text(formData, 'allergies'),
    notes: text(formData, 'notes'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await saveHairProfile(context.tenant.id, clientId.data, parsed.data)
    revalidatePath(`/clientes/${clientId.data}`)
    return ok('Ficha capilar salva.')
  } catch (error) {
    return fail(error)
  }
}

export async function createChemicalRecordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('clients.hair_record.manage')
  const clientId = uuidSchema.safeParse(text(formData, 'clientId'))
  if (!clientId.success) return fail(clientId.error)

  const tones = textList(formData, 'tone')
  const grams = formData.getAll('grams').map((value) => String(value))
  const items = tones
    .map((tone, index) => ({ tone, grams: Number(grams[index] ?? 0) }))
    .filter((item) => item.tone.trim().length > 0)

  const parsed = chemicalRecordSchema.safeParse({
    procedure: text(formData, 'procedure') || 'COLORING',
    professionalId: text(formData, 'professionalId'),
    brand: text(formData, 'brand'),
    productName: text(formData, 'productName'),
    items,
    oxidantVolume: numberOrUndefined(formData, 'oxidantVolume'),
    oxidantMl: numberOrUndefined(formData, 'oxidantMl'),
    pauseMinutes: numberOrUndefined(formData, 'pauseMinutes'),
    result: text(formData, 'result'),
    notes: text(formData, 'notes'),
    performedAt: text(formData, 'performedAt'),
    saveAsFormula: checkbox(formData, 'saveAsFormula'),
    formulaName: text(formData, 'formulaName'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createChemicalRecord(context.tenant.id, clientId.data, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'chemical_record.created',
      entity: 'chemical_history',
      entityId: id,
      summary: `Registro químico lançado (${parsed.data.procedure})`,
    })
    revalidatePath(`/clientes/${clientId.data}`)
    return ok('Registro adicionado ao histórico químico.')
  } catch (error) {
    return fail(error)
  }
}

export async function uploadClientPhotoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('clients.hair_record.manage')
  const clientId = uuidSchema.safeParse(text(formData, 'clientId'))
  if (!clientId.success) return fail(clientId.error)

  const parsed = clientPhotoSchema.safeParse({
    kind: text(formData, 'kind') || 'OTHER',
    caption: text(formData, 'caption'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  const file = formData.get('photo')
  if (!(file instanceof File)) {
    return { status: 'error', message: 'Selecione uma imagem.' }
  }

  try {
    const stored = await storeClientPhoto(context.tenant.id, clientId.data, file)
    await registerClientPhoto(context.tenant.id, clientId.data, {
      kind: parsed.data.kind,
      caption: parsed.data.caption,
      storagePath: stored.storagePath,
    })
    revalidatePath(`/clientes/${clientId.data}`)
    return ok('Foto adicionada.')
  } catch (error) {
    return fail(error)
  }
}

export async function deleteClientPhotoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('clients.hair_record.manage')
  const photoId = uuidSchema.safeParse(text(formData, 'photoId'))
  const clientId = uuidSchema.safeParse(text(formData, 'clientId'))
  if (!photoId.success || !clientId.success) {
    return { status: 'error', message: 'Foto inválida.' }
  }

  try {
    const storagePath = await deleteClientPhoto(context.tenant.id, photoId.data)
    if (storagePath) await getStorage().remove(storagePath)
    revalidatePath(`/clientes/${clientId.data}`)
    return ok('Foto removida.')
  } catch (error) {
    return fail(error)
  }
}

const importPayloadSchema = z.object({
  content: z.string().min(1, 'Selecione um arquivo CSV.').max(2_000_000),
})

export async function importClientsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('clients.create')
  const parsed = importPayloadSchema.safeParse({ content: text(formData, 'content') })
  if (!parsed.success) return fromZod(parsed.error)

  // The browser preview is a convenience; the file is parsed and validated
  // again here before anything is written.
  const result = parseClientsCsv(parsed.data.content)
  if (result.rows.length === 0) {
    return {
      status: 'error',
      message:
        result.issues[0]?.message ?? 'Nenhuma linha válida encontrada no arquivo.',
    }
  }

  try {
    const imported = await importClients(context.tenant.id, result.rows)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'client.imported',
      entity: 'client',
      summary: `${imported.imported} cliente(s) importada(s), ${imported.skipped} ignorada(s)`,
    })
    revalidatePath('/clientes')
    return ok(
      `${imported.imported} cliente(s) importada(s).${
        imported.skipped > 0
          ? ` ${imported.skipped} já estavam cadastradas e foram ignoradas.`
          : ''
      }`,
    )
  } catch (error) {
    return fail(error)
  }
}
