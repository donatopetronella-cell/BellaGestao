import { randomUUID } from 'node:crypto'
import { getAdminDb, hardDeleteTenant } from '@/lib/db'
import type { MemberRole } from '@/generated/prisma/enums'

export interface TestTenant {
  tenantId: string
  branchId: string
  ownerId: string
  clientId: string
  professionalId: string
  serviceId: string
  slug: string
}

/** Creates a fully-formed tenant (owner, branch, client, service) for tests. */
export async function createTestTenant(
  label: string,
  role: MemberRole = 'OWNER',
): Promise<TestTenant> {
  const db = getAdminDb()
  const slug = `test-${label}-${randomUUID().slice(0, 8)}`

  const plan =
    (await db.plan.findFirst({ orderBy: { sortOrder: 'asc' } })) ??
    (await db.plan.create({
      data: { code: `test-${randomUUID().slice(0, 6)}`, name: 'Teste', priceMonthly: 0 },
    }))

  const tenant = await db.tenant.create({
    data: {
      name: `Salão ${label}`,
      slug,
      settings: { create: {} },
      branches: { create: { name: 'Principal', slug: 'principal', isDefault: true } },
      subscription: { create: { planId: plan.id, status: 'TRIAL' } },
    },
    select: { id: true, branches: { select: { id: true } } },
  })

  const branchId = tenant.branches[0]!.id

  const user = await db.user.create({
    data: {
      email: `${slug}@example.test`,
      name: `Dona ${label}`,
      passwordHash: 'not-a-real-hash',
    },
    select: { id: true },
  })

  await db.membership.create({
    data: { tenantId: tenant.id, userId: user.id, role },
  })

  const professional = await db.professional.create({
    data: { tenantId: tenant.id, name: `Profissional ${label}` },
    select: { id: true },
  })

  const service = await db.service.create({
    data: {
      tenantId: tenant.id,
      name: `Serviço ${label}`,
      durationMinutes: 60,
      price: 100,
    },
    select: { id: true },
  })

  const client = await db.client.create({
    data: {
      tenantId: tenant.id,
      branchId,
      name: `Cliente ${label}`,
      phone: '(11) 90000-0000',
    },
    select: { id: true },
  })

  return {
    tenantId: tenant.id,
    branchId,
    ownerId: user.id,
    clientId: client.id,
    professionalId: professional.id,
    serviceId: service.id,
    slug,
  }
}

export async function createTestAppointment(
  tenant: TestTenant,
  options: { startsAt?: Date; status?: 'FINISHED' | 'CONFIRMED'; total?: number } = {},
): Promise<string> {
  const db = getAdminDb()
  const startsAt = options.startsAt ?? new Date()
  const appointment = await db.appointment.create({
    data: {
      tenantId: tenant.tenantId,
      branchId: tenant.branchId,
      clientId: tenant.clientId,
      professionalId: tenant.professionalId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60_000),
      status: options.status ?? 'FINISHED',
      total: options.total ?? 100,
      finishedAt: options.status === 'CONFIRMED' ? null : startsAt,
      services: {
        create: {
          tenantId: tenant.tenantId,
          serviceId: tenant.serviceId,
          professionalId: tenant.professionalId,
          price: options.total ?? 100,
          durationMinutes: 60,
        },
      },
    },
    select: { id: true },
  })
  return appointment.id
}

export async function destroyTestTenant(tenant: TestTenant): Promise<void> {
  await hardDeleteTenant(tenant.tenantId).catch(() => undefined)
  await getAdminDb()
    .user.delete({ where: { id: tenant.ownerId } })
    .catch(() => undefined)
}
