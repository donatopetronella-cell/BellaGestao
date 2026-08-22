import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getAdminDb, withContext, withTenant, withUser, disconnectDb } from '@/lib/db'
import {
  createTestAppointment,
  createTestTenant,
  destroyTestTenant,
  type TestTenant,
} from './helpers'

/**
 * The single most important guarantee of the product: a salon can never read or
 * write another salon's rows. These tests run against the real database through
 * the application role, so they exercise the PostgreSQL policies themselves.
 */
describe('isolamento multi-tenant', () => {
  let tenantA: TestTenant
  let tenantB: TestTenant

  beforeAll(async () => {
    tenantA = await createTestTenant('a')
    tenantB = await createTestTenant('b')
    await createTestAppointment(tenantA)
    await createTestAppointment(tenantB)
  })

  afterAll(async () => {
    await destroyTestTenant(tenantA)
    await destroyTestTenant(tenantB)
    await disconnectDb()
  })

  it('a runtime connection never runs as a superuser or table owner', async () => {
    const rows = await withContext({}, (tx) =>
      tx.$queryRaw<Array<{ is_superuser: boolean; bypassrls: boolean }>>`
        SELECT rolsuper AS is_superuser, rolbypassrls AS bypassrls
        FROM pg_roles WHERE rolname = current_user
      `,
    )
    expect(rows[0]?.is_superuser).toBe(false)
    expect(rows[0]?.bypassrls).toBe(false)
  })

  it('todas as tabelas com tenant_id têm RLS habilitado e uma policy', async () => {
    const rows = await withContext({}, (tx) =>
      tx.$queryRaw<Array<{ table_name: string; rls: boolean; policies: bigint }>>`
        SELECT c.relname AS table_name,
               c.relrowsecurity AS rls,
               (SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND a.attnum > 0
        WHERE n.nspname = 'public' AND c.relkind = 'r'
      `,
    )

    expect(rows.length).toBeGreaterThan(30)
    const unprotected = rows.filter((row) => !row.rls || Number(row.policies) === 0)
    expect(unprotected.map((row) => row.table_name)).toEqual([])
  })

  it('tenant A não enxerga nenhum registro do tenant B', async () => {
    const result = await withTenant(tenantA.tenantId, async (tx) => ({
      clients: await tx.client.findMany({ select: { id: true } }),
      appointments: await tx.appointment.findMany({ select: { id: true } }),
      services: await tx.service.findMany({ select: { id: true } }),
      professionals: await tx.professional.findMany({ select: { id: true } }),
      tenants: await tx.tenant.findMany({ select: { id: true } }),
    }))

    expect(result.clients.map((row) => row.id)).toContain(tenantA.clientId)
    expect(result.clients.map((row) => row.id)).not.toContain(tenantB.clientId)
    expect(result.services.map((row) => row.id)).not.toContain(tenantB.serviceId)
    expect(result.professionals.map((row) => row.id)).not.toContain(
      tenantB.professionalId,
    )
    expect(result.tenants.map((row) => row.id)).toEqual([tenantA.tenantId])
    expect(result.appointments).toHaveLength(1)
  })

  it('busca direta por id de outro tenant retorna vazio', async () => {
    const found = await withTenant(tenantA.tenantId, (tx) =>
      tx.client.findUnique({ where: { id: tenantB.clientId } }),
    )
    expect(found).toBeNull()
  })

  it('não é possível atualizar registro de outro tenant', async () => {
    const result = await withTenant(tenantA.tenantId, (tx) =>
      tx.client.updateMany({
        where: { id: tenantB.clientId },
        data: { name: 'invadido' },
      }),
    )
    expect(result.count).toBe(0)

    const untouched = await getAdminDb().client.findUniqueOrThrow({
      where: { id: tenantB.clientId },
      select: { name: true },
    })
    expect(untouched.name).not.toBe('invadido')
  })

  it('não é possível excluir registro de outro tenant', async () => {
    const result = await withTenant(tenantA.tenantId, (tx) =>
      tx.client.deleteMany({ where: { id: tenantB.clientId } }),
    )
    expect(result.count).toBe(0)
    expect(
      await getAdminDb().client.count({ where: { id: tenantB.clientId } }),
    ).toBe(1)
  })

  it('não é possível inserir linha carimbada com outro tenant_id', async () => {
    await expect(
      withTenant(tenantA.tenantId, (tx) =>
        tx.client.create({
          data: {
            tenantId: tenantB.tenantId,
            branchId: tenantB.branchId,
            name: 'Cliente forjada',
          },
        }),
      ),
    ).rejects.toThrow()
  })

  it('sem contexto de tenant nenhuma linha é visível', async () => {
    const rows = await withContext({}, (tx) => tx.client.findMany())
    expect(rows).toEqual([])
  })

  it('contexto apenas de usuário expõe somente os salões daquele usuário', async () => {
    const tenants = await withUser(tenantA.ownerId, (tx) =>
      tx.tenant.findMany({ select: { id: true } }),
    )
    expect(tenants.map((row) => row.id)).toEqual([tenantA.tenantId])

    const memberships = await withUser(tenantA.ownerId, (tx) =>
      tx.membership.findMany({ select: { tenantId: true } }),
    )
    expect(memberships.map((row) => row.tenantId)).toEqual([tenantA.tenantId])
  })

  it('agregações também respeitam o isolamento', async () => {
    const totals = await withTenant(tenantA.tenantId, (tx) =>
      tx.appointment.aggregate({ _sum: { total: true }, _count: { _all: true } }),
    )
    expect(totals._count._all).toBe(1)
    expect(Number(totals._sum.total ?? 0)).toBe(100)
  })

  it('SQL bruto dentro do contexto continua filtrado pela policy', async () => {
    const rows = await withTenant(tenantA.tenantId, (tx) =>
      tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM clients`,
    )
    expect(rows.map((row) => row.id)).toEqual([tenantA.clientId])
  })

  it('identificadores inválidos são rejeitados antes de chegar ao banco', async () => {
    await expect(
      withTenant("' OR 1=1 --", (tx) => tx.client.findMany()),
    ).rejects.toThrow(/UUID/)
  })
})
