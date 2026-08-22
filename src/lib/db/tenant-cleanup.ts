import { getAdminDb } from './prisma'

/**
 * Hard-deletes a tenant and everything under it.
 *
 * Foreign keys to `professionals` and `services` deliberately restrict
 * deletion (a professional with history must be deactivated, not erased), so a
 * full tenant removal walks the tables in dependency order instead of relying
 * on cascades. Used by the seed, the test helpers and the LGPD
 * account-closure flow.
 */
export const DELETION_ORDER = [
  'campaign_targets',
  'whatsapp_messages',
  'campaigns',
  'whatsapp_templates',
  'loyalty_transactions',
  'loyalty_accounts',
  'loyalty_programs',
  'commissions',
  'commission_rules',
  'sale_payments',
  'sale_items',
  'sales',
  'cash_movements',
  'cash_registers',
  'revenues',
  'expenses',
  'financial_categories',
  'inventory_movements',
  'inventory',
  'service_supplies',
  'service_professionals',
  'appointment_services',
  'client_photos',
  'chemical_history',
  'hair_formulas',
  'client_hair_profiles',
  'appointments',
  'consent_records',
  'clients',
  'products',
  'product_categories',
  'suppliers',
  'services',
  'service_categories',
  'professional_time_off',
  'professional_working_hours',
  'member_permission_overrides',
  'memberships',
  'professionals',
  'invitations',
  'branch_opening_hours',
  'branches',
  'notifications',
  'audit_logs',
  'payments',
  'subscriptions',
  'tenant_settings',
] as const

export async function hardDeleteTenant(tenantId: string): Promise<void> {
  const db = getAdminDb()
  await db.$transaction(async (tx) => {
    for (const table of DELETION_ORDER) {
      await tx.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE tenant_id = $1::uuid`,
        tenantId,
      )
    }
    await tx.$executeRawUnsafe(`DELETE FROM "tenants" WHERE id = $1::uuid`, tenantId)
  })
}
