import 'server-only'
import { withTenant } from '@/lib/db'
import { normalizePhone } from '@/lib/utils'
import type { ParsedClientRow } from './import'

export interface ImportResult {
  imported: number
  skipped: number
  skippedNames: string[]
}

/**
 * Writes the validated rows. Clients already registered with the same phone are
 * skipped instead of duplicated — the salon's base is the source of truth.
 */
export async function importClients(
  tenantId: string,
  rows: ParsedClientRow[],
): Promise<ImportResult> {
  if (rows.length === 0) return { imported: 0, skipped: 0, skippedNames: [] }

  return withTenant(tenantId, async (tx) => {
    const branch = await tx.branch.findFirst({
      where: { tenantId, isDefault: true },
      select: { id: true },
    })

    const phones = rows
      .map((row) => row.phone)
      .filter((phone): phone is string => Boolean(phone))

    const existing =
      phones.length === 0
        ? []
        : await tx.client.findMany({
            where: { tenantId, deletedAt: null, phone: { in: phones } },
            select: { phone: true },
          })

    const existingPhones = new Set(
      existing.map((row) => normalizePhone(row.phone ?? '')),
    )

    const skippedNames: string[] = []
    const toCreate = rows.filter((row) => {
      const digits = row.phone ? normalizePhone(row.phone) : ''
      if (digits && existingPhones.has(digits)) {
        skippedNames.push(row.name)
        return false
      }
      return true
    })

    if (toCreate.length > 0) {
      await tx.client.createMany({
        data: toCreate.map((row) => ({
          tenantId,
          branchId: branch?.id ?? null,
          name: row.name,
          phone: row.phone ?? null,
          whatsapp: row.phone ?? null,
          email: row.email ?? null,
          birthDate: row.birthDate ? new Date(`${row.birthDate}T12:00:00.000Z`) : null,
          source: 'Importação',
        })),
      })
    }

    return {
      imported: toCreate.length,
      skipped: skippedNames.length,
      skippedNames: skippedNames.slice(0, 10),
    }
  })
}
