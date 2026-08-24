import 'server-only'
import { withTenant } from '@/lib/db'
import { conflict, notFound } from '@/lib/errors'
import type { ServiceInput } from '@/validators/service'

export interface ServiceListItem {
  id: string
  name: string
  categoryName: string | null
  durationMinutes: number
  price: number
  cost: number
  commissionKind: 'PERCENT' | 'FIXED'
  commissionValue: number
  isActive: boolean
  professionals: Array<{ id: string; name: string; price: number | null }>
}

export interface ServiceListResult {
  items: ServiceListItem[]
  total: number
  page: number
  perPage: number
}

export interface ServiceListFilters {
  search?: string
  categoryId?: string | null
  includeInactive?: boolean
  page?: number
  perPage?: number
}

export async function listServices(
  tenantId: string,
  filters: ServiceListFilters = {},
): Promise<ServiceListResult> {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(100, filters.perPage ?? 20)

  return withTenant(tenantId, async (tx) => {
    const where = {
      tenantId,
      deletedAt: null,
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' as const } }
        : {}),
    }

    const total = await tx.service.count({ where })
    const rows = await tx.service.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        price: true,
        cost: true,
        commissionKind: true,
        commissionValue: true,
        isActive: true,
        category: { select: { name: true } },
        professionals: {
          select: {
            price: true,
            professional: { select: { id: true, name: true } },
          },
        },
      },
    })

    return {
      total,
      page,
      perPage,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        categoryName: row.category?.name ?? null,
        durationMinutes: row.durationMinutes,
        price: Number(row.price),
        cost: Number(row.cost),
        commissionKind: row.commissionKind,
        commissionValue: Number(row.commissionValue),
        isActive: row.isActive,
        professionals: row.professionals.map((link) => ({
          id: link.professional.id,
          name: link.professional.name,
          price: link.price === null ? null : Number(link.price),
        })),
      })),
    }
  })
}

export interface ServiceDetail extends ServiceListItem {
  description: string | null
  categoryId: string | null
}

export async function getService(
  tenantId: string,
  serviceId: string,
): Promise<ServiceDetail> {
  const row = await withTenant(tenantId, (tx) =>
    tx.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        categoryId: true,
        durationMinutes: true,
        price: true,
        cost: true,
        commissionKind: true,
        commissionValue: true,
        isActive: true,
        category: { select: { name: true } },
        professionals: {
          select: { price: true, professional: { select: { id: true, name: true } } },
        },
      },
    }),
  )

  if (!row) throw notFound('Serviço não encontrado.')

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    durationMinutes: row.durationMinutes,
    price: Number(row.price),
    cost: Number(row.cost),
    commissionKind: row.commissionKind,
    commissionValue: Number(row.commissionValue),
    isActive: row.isActive,
    professionals: row.professionals.map((link) => ({
      id: link.professional.id,
      name: link.professional.name,
      price: link.price === null ? null : Number(link.price),
    })),
  }
}

async function assertProfessionalsBelongToTenant(
  tenantId: string,
  professionalIds: string[],
): Promise<void> {
  if (professionalIds.length === 0) return
  const count = await withTenant(tenantId, (tx) =>
    tx.professional.count({
      where: { tenantId, id: { in: professionalIds }, deletedAt: null },
    }),
  )
  if (count !== professionalIds.length) {
    throw notFound('Profissional não encontrado neste salão.')
  }
}

export async function createService(
  tenantId: string,
  input: ServiceInput,
): Promise<string> {
  await assertProfessionalsBelongToTenant(tenantId, input.professionalIds)

  return withTenant(tenantId, async (tx) => {
    const duplicate = await tx.service.findFirst({
      where: { tenantId, name: input.name, deletedAt: null },
      select: { id: true },
    })
    if (duplicate) throw conflict('Já existe um serviço com este nome.')

    const service = await tx.service.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description || null,
        categoryId: input.categoryId,
        durationMinutes: input.durationMinutes,
        price: input.price,
        cost: input.cost,
        commissionKind: input.commissionKind,
        commissionValue: input.commissionValue,
        isActive: input.isActive,
        professionals: {
          create: input.professionalIds.map((professionalId) => ({
            tenantId,
            professionalId,
          })),
        },
      },
      select: { id: true },
    })
    return service.id
  })
}

export async function updateService(
  tenantId: string,
  serviceId: string,
  input: ServiceInput,
): Promise<void> {
  await assertProfessionalsBelongToTenant(tenantId, input.professionalIds)

  await withTenant(tenantId, async (tx) => {
    const existing = await tx.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!existing) throw notFound('Serviço não encontrado.')

    const duplicate = await tx.service.findFirst({
      where: { tenantId, name: input.name, deletedAt: null, id: { not: serviceId } },
      select: { id: true },
    })
    if (duplicate) throw conflict('Já existe um serviço com este nome.')

    await tx.service.update({
      where: { id: serviceId },
      data: {
        name: input.name,
        description: input.description || null,
        categoryId: input.categoryId,
        durationMinutes: input.durationMinutes,
        price: input.price,
        cost: input.cost,
        commissionKind: input.commissionKind,
        commissionValue: input.commissionValue,
        isActive: input.isActive,
      },
    })

    const current = await tx.serviceProfessional.findMany({
      where: { tenantId, serviceId },
      select: { id: true, professionalId: true },
    })
    const keep = new Set(input.professionalIds)

    const toRemove = current.filter((link) => !keep.has(link.professionalId))
    if (toRemove.length > 0) {
      await tx.serviceProfessional.deleteMany({
        where: { id: { in: toRemove.map((link) => link.id) } },
      })
    }

    const existingIds = new Set(current.map((link) => link.professionalId))
    const toAdd = input.professionalIds.filter((id) => !existingIds.has(id))
    if (toAdd.length > 0) {
      await tx.serviceProfessional.createMany({
        data: toAdd.map((professionalId) => ({ tenantId, serviceId, professionalId })),
      })
    }
  })
}

/** Services keep history (appointments, sales), so removal is logical. */
export async function archiveService(
  tenantId: string,
  serviceId: string,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.service.updateMany({
      where: { id: serviceId, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    })
    if (result.count === 0) throw notFound('Serviço não encontrado.')
  })
}

export async function setServiceActive(
  tenantId: string,
  serviceId: string,
  isActive: boolean,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.service.updateMany({
      where: { id: serviceId, tenantId, deletedAt: null },
      data: { isActive },
    })
    if (result.count === 0) throw notFound('Serviço não encontrado.')
  })
}

/** Price/duration for a service, honouring the per-professional override. */
export async function resolveServicePricing(
  tenantId: string,
  serviceId: string,
  professionalId: string,
): Promise<{ price: number; durationMinutes: number; commissionAmount: number }> {
  return withTenant(tenantId, async (tx) => {
    const service = await tx.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
      select: {
        price: true,
        durationMinutes: true,
        commissionKind: true,
        commissionValue: true,
      },
    })
    if (!service) throw notFound('Serviço não encontrado.')

    const override = await tx.serviceProfessional.findFirst({
      where: { tenantId, serviceId, professionalId },
      select: { price: true, durationMinutes: true, commissionValue: true },
    })

    const professional = await tx.professional.findFirst({
      where: { id: professionalId, tenantId, deletedAt: null },
      select: { commissionPercent: true },
    })
    if (!professional) throw notFound('Profissional não encontrado.')

    const price = Number(override?.price ?? service.price)
    const durationMinutes = override?.durationMinutes ?? service.durationMinutes

    const commissionValue =
      override?.commissionValue === null || override?.commissionValue === undefined
        ? Number(service.commissionValue) || Number(professional.commissionPercent)
        : Number(override.commissionValue)

    const commissionAmount =
      service.commissionKind === 'FIXED'
        ? commissionValue
        : Math.round(((price * commissionValue) / 100) * 100) / 100

    return { price, durationMinutes, commissionAmount }
  })
}

export async function listServiceOptions(
  tenantId: string,
): Promise<Array<{ id: string; name: string; price: number }>> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.service.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, price: true },
    }),
  )
  return rows.map((row) => ({ id: row.id, name: row.name, price: Number(row.price) }))
}

export async function listServiceCategories(
  tenantId: string,
): Promise<Array<{ id: string; name: string; serviceCount: number }>> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.serviceCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: { select: { services: true } },
      },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    serviceCount: row._count.services,
  }))
}

export async function createServiceCategory(
  tenantId: string,
  name: string,
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const duplicate = await tx.serviceCategory.findFirst({
      where: { tenantId, name },
      select: { id: true },
    })
    if (duplicate) throw conflict('Já existe uma categoria com este nome.')

    const category = await tx.serviceCategory.create({
      data: { tenantId, name },
      select: { id: true },
    })
    return category.id
  })
}
