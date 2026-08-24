'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import { adjustStock } from '@/features/inventory/service'
import { stockAdjustmentSchema } from '@/validators/product'
import type { FormState } from './types'
import { fail, fromZod, ok, text } from './form'

export async function adjustStockAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('inventory.manage')
  const parsed = stockAdjustmentSchema.safeParse({
    productId: text(formData, 'productId'),
    type: text(formData, 'type'),
    quantity: text(formData, 'quantity'),
    unitCost: text(formData, 'unitCost') || undefined,
    reason: text(formData, 'reason'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await adjustStock(context.tenant.id, parsed.data, { userId: context.user.id })
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'inventory.adjusted',
      entity: 'product',
      entityId: parsed.data.productId,
      summary: `Movimentação de estoque: ${parsed.data.type} (${parsed.data.quantity})`,
    })
    revalidatePath('/estoque')
    revalidatePath('/produtos')
    return ok('Estoque atualizado.')
  } catch (error) {
    return fail(error)
  }
}
