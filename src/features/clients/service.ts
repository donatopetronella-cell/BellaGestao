import 'server-only'
import type { AppointmentStatus, PhotoKind } from '@/generated/prisma/enums'
import { withTenant } from '@/lib/db'
import { conflict, notFound } from '@/lib/errors'
import { normalizePhone } from '@/lib/utils'
import type {
  ChemicalRecordInput,
  ClientInput,
  HairProfileInput,
} from '@/validators/client'

export interface ClientListItem {
  id: string
  name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  birthDate: Date | null
  lastVisitAt: Date | null
  daysSinceLastVisit: number | null
  totalSpent: number
  visits: number
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
}

export interface ClientListResult {
  items: ClientListItem[]
  total: number
  page: number
  perPage: number
}

export type ClientFilter = 'todos' | 'novos' | 'inativos' | 'aniversariantes'

const DAY_MS = 24 * 60 * 60 * 1000

export async function listClients(
  tenantId: string,
  options: {
    search?: string
    filter?: ClientFilter
    page?: number
    perPage?: number
    now?: Date
  } = {},
): Promise<ClientListResult> {
  const page = Math.max(1, options.page ?? 1)
  const perPage = Math.min(100, options.perPage ?? 20)
  const now = options.now ?? new Date()
  const search = options.search?.trim()

  return withTenant(tenantId, async (tx) => {
    const digits = search ? normalizePhone(search) : ''
    const where = {
      tenantId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              ...(digits.length >= 3
                ? [
                    { phone: { contains: digits } },
                    { whatsapp: { contains: digits } },
                    { phone: { contains: search } },
                    { whatsapp: { contains: search } },
                  ]
                : []),
            ],
          }
        : {}),
      ...(options.filter === 'novos'
        ? { createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } }
        : {}),
      ...(options.filter === 'inativos'
        ? {
            OR: [
              { lastVisitAt: { lt: new Date(now.getTime() - 90 * DAY_MS) } },
              { lastVisitAt: null },
            ],
          }
        : {}),
    }

    const total = await tx.client.count({ where })
    const rows = await tx.client.findMany({
      where,
      orderBy: search ? { name: 'asc' } : [{ lastVisitAt: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true,
        email: true,
        birthDate: true,
        lastVisitAt: true,
        status: true,
      },
    })

    const ids = rows.map((row) => row.id)
    const totals =
      ids.length === 0
        ? []
        : await tx.appointment.groupBy({
            by: ['clientId'],
            where: { tenantId, clientId: { in: ids }, status: 'FINISHED' },
            _sum: { total: true },
            _count: { _all: true },
          })

    const totalsByClient = new Map(
      totals.map((row) => [
        row.clientId,
        { spent: Number(row._sum.total ?? 0), visits: row._count._all },
      ]),
    )

    return {
      total,
      page,
      perPage,
      items: rows.map((row) => {
        const aggregate = totalsByClient.get(row.id)
        return {
          id: row.id,
          name: row.name,
          phone: row.phone,
          whatsapp: row.whatsapp,
          email: row.email,
          birthDate: row.birthDate,
          lastVisitAt: row.lastVisitAt,
          daysSinceLastVisit: row.lastVisitAt
            ? Math.floor((now.getTime() - row.lastVisitAt.getTime()) / DAY_MS)
            : null,
          totalSpent: aggregate?.spent ?? 0,
          visits: aggregate?.visits ?? 0,
          status: row.status,
        }
      }),
    }
  })
}

export interface ClientMetrics {
  totalSpent: number
  visits: number
  averageTicket: number
  cancellations: number
  noShows: number
  averageIntervalDays: number | null
  expectedReturnAt: Date | null
  lastVisitAt: Date | null
  firstVisitAt: Date | null
}

export interface ClientAppointmentRow {
  id: string
  startsAt: Date
  status: AppointmentStatus
  professionalName: string
  services: string[]
  total: number
}

export interface ClientDetail {
  id: string
  name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  document: string | null
  birthDate: Date | null
  zipCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  notes: string | null
  preferences: string | null
  allergies: string | null
  source: string | null
  preferredProfessionalId: string | null
  preferredProfessionalName: string | null
  marketingConsent: boolean
  createdAt: Date
  metrics: ClientMetrics
  appointments: ClientAppointmentRow[]
  loyaltyPoints: number
}

export async function getClient(
  tenantId: string,
  clientId: string,
): Promise<ClientDetail> {
  return withTenant(tenantId, async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true,
        email: true,
        document: true,
        birthDate: true,
        zipCode: true,
        street: true,
        number: true,
        complement: true,
        district: true,
        city: true,
        state: true,
        notes: true,
        preferences: true,
        allergies: true,
        source: true,
        preferredProfessionalId: true,
        marketingConsent: true,
        createdAt: true,
        firstVisitAt: true,
        lastVisitAt: true,
        preferredProfessional: { select: { name: true } },
        loyaltyAccount: { select: { pointsBalance: true } },
      },
    })
    if (!client) throw notFound('Cliente não encontrada.')

    const appointments = await tx.appointment.findMany({
      where: { tenantId, clientId },
      orderBy: { startsAt: 'desc' },
      take: 50,
      select: {
        id: true,
        startsAt: true,
        status: true,
        total: true,
        professional: { select: { name: true } },
        services: { select: { service: { select: { name: true } } } },
      },
    })

    const finished = appointments.filter(
      (appointment) => appointment.status === 'FINISHED',
    )
    const totalSpent = finished.reduce(
      (sum, appointment) => sum + Number(appointment.total),
      0,
    )

    const finishedDates = finished
      .map((appointment) => appointment.startsAt.getTime())
      .sort((a, b) => a - b)

    let averageIntervalDays: number | null = null
    if (finishedDates.length >= 2) {
      const gaps: number[] = []
      for (let index = 1; index < finishedDates.length; index += 1) {
        gaps.push((finishedDates[index]! - finishedDates[index - 1]!) / DAY_MS)
      }
      averageIntervalDays = Math.round(
        gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length,
      )
    }

    const lastVisitAt =
      client.lastVisitAt ??
      (finishedDates.length > 0
        ? new Date(finishedDates[finishedDates.length - 1]!)
        : null)

    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      whatsapp: client.whatsapp,
      email: client.email,
      document: client.document,
      birthDate: client.birthDate,
      zipCode: client.zipCode,
      street: client.street,
      number: client.number,
      complement: client.complement,
      district: client.district,
      city: client.city,
      state: client.state,
      notes: client.notes,
      preferences: client.preferences,
      allergies: client.allergies,
      source: client.source,
      preferredProfessionalId: client.preferredProfessionalId,
      preferredProfessionalName: client.preferredProfessional?.name ?? null,
      marketingConsent: client.marketingConsent,
      createdAt: client.createdAt,
      loyaltyPoints: client.loyaltyAccount?.pointsBalance ?? 0,
      metrics: {
        totalSpent,
        visits: finished.length,
        averageTicket: finished.length > 0 ? totalSpent / finished.length : 0,
        cancellations: appointments.filter((row) => row.status === 'CANCELED').length,
        noShows: appointments.filter((row) => row.status === 'NO_SHOW').length,
        averageIntervalDays,
        expectedReturnAt:
          lastVisitAt && averageIntervalDays
            ? new Date(lastVisitAt.getTime() + averageIntervalDays * DAY_MS)
            : null,
        lastVisitAt,
        firstVisitAt: client.firstVisitAt,
      },
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        startsAt: appointment.startsAt,
        status: appointment.status,
        professionalName: appointment.professional.name,
        services: appointment.services.map((item) => item.service.name),
        total: Number(appointment.total),
      })),
    }
  })
}

function clientData(input: ClientInput) {
  return {
    name: input.name,
    phone: input.phone ?? null,
    whatsapp: input.whatsapp ?? input.phone ?? null,
    email: input.email || null,
    document: input.document || null,
    birthDate: input.birthDate,
    zipCode: input.zipCode || null,
    street: input.street || null,
    number: input.number || null,
    complement: input.complement || null,
    district: input.district || null,
    city: input.city || null,
    state: input.state || null,
    notes: input.notes || null,
    preferences: input.preferences || null,
    allergies: input.allergies || null,
    source: input.source || null,
    preferredProfessionalId: input.preferredProfessionalId,
    marketingConsent: input.marketingConsent,
    consentAt: input.marketingConsent ? new Date() : null,
  }
}

export async function createClient(
  tenantId: string,
  input: ClientInput,
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    if (input.phone) {
      const duplicate = await tx.client.findFirst({
        where: { tenantId, phone: input.phone, deletedAt: null },
        select: { id: true, name: true },
      })
      if (duplicate) {
        throw conflict(`Este telefone já está cadastrado para ${duplicate.name}.`)
      }
    }

    const branch = await tx.branch.findFirst({
      where: { tenantId, isDefault: true },
      select: { id: true },
    })

    const client = await tx.client.create({
      data: { tenantId, branchId: branch?.id ?? null, ...clientData(input) },
      select: { id: true },
    })
    return client.id
  })
}

export async function updateClient(
  tenantId: string,
  clientId: string,
  input: ClientInput,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    if (input.phone) {
      const duplicate = await tx.client.findFirst({
        where: {
          tenantId,
          phone: input.phone,
          deletedAt: null,
          id: { not: clientId },
        },
        select: { name: true },
      })
      if (duplicate) {
        throw conflict(`Este telefone já está cadastrado para ${duplicate.name}.`)
      }
    }

    const result = await tx.client.updateMany({
      where: { id: clientId, tenantId, deletedAt: null },
      data: clientData(input),
    })
    if (result.count === 0) throw notFound('Cliente não encontrada.')
  })
}

/** LGPD: keeps the financial history, removes the personal data. */
export async function anonymizeClient(
  tenantId: string,
  clientId: string,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.client.updateMany({
      where: { id: clientId, tenantId, deletedAt: null },
      data: {
        name: 'Cliente removida',
        phone: null,
        whatsapp: null,
        email: null,
        document: null,
        birthDate: null,
        zipCode: null,
        street: null,
        number: null,
        complement: null,
        district: null,
        city: null,
        state: null,
        notes: null,
        preferences: null,
        allergies: null,
        marketingConsent: false,
        anonymizedAt: new Date(),
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    })
    if (result.count === 0) throw notFound('Cliente não encontrada.')
  })
}

// --- ficha capilar --------------------------------------------------------

export async function getHairProfile(
  tenantId: string,
  clientId: string,
): Promise<HairProfileInput | null> {
  const row = await withTenant(tenantId, (tx) =>
    tx.clientHairProfile.findFirst({
      where: { tenantId, clientId },
      select: {
        hairType: true,
        length: true,
        curvature: true,
        texture: true,
        condition: true,
        scalp: true,
        previousProcedures: true,
        allergies: true,
        notes: true,
      },
    }),
  )
  if (!row) return null
  return {
    hairType: row.hairType ?? '',
    length: row.length ?? '',
    curvature: row.curvature ?? '',
    texture: row.texture ?? '',
    condition: row.condition ?? '',
    scalp: row.scalp ?? '',
    previousProcedures: row.previousProcedures ?? '',
    allergies: row.allergies ?? '',
    notes: row.notes ?? '',
  }
}

export async function saveHairProfile(
  tenantId: string,
  clientId: string,
  input: HairProfileInput,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!client) throw notFound('Cliente não encontrada.')

    const data = {
      hairType: input.hairType || null,
      length: input.length || null,
      curvature: input.curvature || null,
      texture: input.texture || null,
      condition: input.condition || null,
      scalp: input.scalp || null,
      previousProcedures: input.previousProcedures || null,
      allergies: input.allergies || null,
      notes: input.notes || null,
    }

    await tx.clientHairProfile.upsert({
      where: { clientId },
      create: { tenantId, clientId, ...data },
      update: data,
    })
  })
}

// --- histórico químico ----------------------------------------------------

export interface FormulaItem {
  tone: string
  grams: number
}

export interface ChemicalRecordRow {
  id: string
  procedure: string
  brand: string | null
  productName: string | null
  items: FormulaItem[]
  oxidantVolume: number | null
  oxidantMl: number | null
  pauseMinutes: number | null
  result: string | null
  notes: string | null
  performedAt: Date
  professionalName: string | null
}

function parseFormula(value: unknown): FormulaItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const tone = (item as { tone?: unknown }).tone
    const grams = (item as { grams?: unknown }).grams
    if (typeof tone !== 'string') return []
    return [{ tone, grams: Number(grams ?? 0) }]
  })
}

export async function listChemicalRecords(
  tenantId: string,
  clientId: string,
): Promise<ChemicalRecordRow[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.chemicalRecord.findMany({
      where: { tenantId, clientId },
      orderBy: { performedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        procedure: true,
        brand: true,
        productName: true,
        formula: true,
        oxidantVolume: true,
        oxidantMl: true,
        pauseMinutes: true,
        result: true,
        notes: true,
        performedAt: true,
        professional: { select: { name: true } },
      },
    }),
  )

  return rows.map((row) => ({
    id: row.id,
    procedure: row.procedure,
    brand: row.brand,
    productName: row.productName,
    items: parseFormula(row.formula),
    oxidantVolume: row.oxidantVolume,
    oxidantMl: row.oxidantMl,
    pauseMinutes: row.pauseMinutes,
    result: row.result,
    notes: row.notes,
    performedAt: row.performedAt,
    professionalName: row.professional?.name ?? null,
  }))
}

export async function createChemicalRecord(
  tenantId: string,
  clientId: string,
  input: ChemicalRecordInput,
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!client) throw notFound('Cliente não encontrada.')

    const record = await tx.chemicalRecord.create({
      data: {
        tenantId,
        clientId,
        professionalId: input.professionalId,
        procedure: input.procedure,
        brand: input.brand || null,
        productName: input.productName || null,
        formula: input.items,
        oxidantVolume: input.oxidantVolume ?? null,
        oxidantMl: input.oxidantMl ?? null,
        pauseMinutes: input.pauseMinutes ?? null,
        result: input.result || null,
        notes: input.notes || null,
        performedAt: input.performedAt,
      },
      select: { id: true },
    })

    if (input.saveAsFormula) {
      await tx.hairFormula.create({
        data: {
          tenantId,
          clientId,
          name: input.formulaName || `${input.brand ?? 'Fórmula'} · ${input.procedure}`,
          procedure: input.procedure,
          brand: input.brand || null,
          items: input.items,
          oxidantVolume: input.oxidantVolume ?? null,
          oxidantMl: input.oxidantMl ?? null,
          pauseMinutes: input.pauseMinutes ?? null,
          notes: input.notes || null,
        },
      })
    }

    return record.id
  })
}

export interface SavedFormula {
  id: string
  name: string
  procedure: string
  brand: string | null
  items: FormulaItem[]
  oxidantVolume: number | null
  oxidantMl: number | null
  pauseMinutes: number | null
}

export async function listFormulas(
  tenantId: string,
  clientId: string,
): Promise<SavedFormula[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.hairFormula.findMany({
      where: { tenantId, OR: [{ clientId }, { isTemplate: true }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        procedure: true,
        brand: true,
        items: true,
        oxidantVolume: true,
        oxidantMl: true,
        pauseMinutes: true,
      },
    }),
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    procedure: row.procedure,
    brand: row.brand,
    items: parseFormula(row.items),
    oxidantVolume: row.oxidantVolume,
    oxidantMl: row.oxidantMl,
    pauseMinutes: row.pauseMinutes,
  }))
}

// --- fotos ----------------------------------------------------------------

export interface ClientPhotoRow {
  id: string
  kind: PhotoKind
  url: string
  caption: string | null
  takenAt: Date
}

export async function listClientPhotos(
  tenantId: string,
  clientId: string,
): Promise<ClientPhotoRow[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.clientPhoto.findMany({
      where: { tenantId, clientId },
      orderBy: { takenAt: 'desc' },
      take: 60,
      select: {
        id: true,
        kind: true,
        storagePath: true,
        caption: true,
        takenAt: true,
      },
    }),
  )

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    url: `/api/fotos/${row.id}`,
    caption: row.caption,
    takenAt: row.takenAt,
  }))
}

export async function registerClientPhoto(
  tenantId: string,
  clientId: string,
  input: { kind: PhotoKind; caption?: string | null; storagePath: string },
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!client) throw notFound('Cliente não encontrada.')

    const photo = await tx.clientPhoto.create({
      data: {
        tenantId,
        clientId,
        kind: input.kind,
        caption: input.caption || null,
        storagePath: input.storagePath,
      },
      select: { id: true },
    })
    return photo.id
  })
}

export async function getClientPhotoPath(
  tenantId: string,
  photoId: string,
): Promise<string | null> {
  const row = await withTenant(tenantId, (tx) =>
    tx.clientPhoto.findFirst({
      where: { id: photoId, tenantId },
      select: { storagePath: true },
    }),
  )
  return row?.storagePath ?? null
}

export async function deleteClientPhoto(
  tenantId: string,
  photoId: string,
): Promise<string | null> {
  return withTenant(tenantId, async (tx) => {
    const photo = await tx.clientPhoto.findFirst({
      where: { id: photoId, tenantId },
      select: { id: true, storagePath: true },
    })
    if (!photo) throw notFound('Foto não encontrada.')
    await tx.clientPhoto.delete({ where: { id: photo.id } })
    return photo.storagePath
  })
}
