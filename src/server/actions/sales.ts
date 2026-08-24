'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import { createSale } from '@/features/sales/service'
import { createSaleSchema } from '@/validators/sale'
import type { FormState } from './types'
import { fail, fromZod, ok, text, textList } from './form'

export async function createSaleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('sales.create')

  const kinds = textList(formData, 'itemKind')
  const itemIds = textList(formData, 'itemId')
  const itemProfessionalIds = formData.getAll('itemProfessionalId').map((value) => String(value))
  const quantities = formData.getAll('itemQuantity').map((value) => String(value))

  const items = kinds.map((kind, index) => ({
    kind,
    itemId: itemIds[index] ?? '',
    professionalId: itemProfessionalIds[index] || '',
    quantity: quantities[index] || '1',
  }))

  const methods = textList(formData, 'paymentMethod')
  const amounts = formData.getAll('paymentAmount').map((value) => String(value))
  const installments = formData.getAll('paymentInstallments').map((value) => String(value))
  const payments = methods
    .map((method, index) => ({
      method,
      amount: Number(amounts[index] ?? 0),
      installments: Number(installments[index] ?? 1) || 1,
    }))
    .filter((payment) => payment.amount > 0)

  const parsed = createSaleSchema.safeParse({
    clientId: text(formData, 'clientId'),
    discount: text(formData, 'discount') || 0,
    items,
    payments,
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const result = await createSale(context.tenant.id, parsed.data, {
      userId: context.user.id,
    })
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'sale.created',
      entity: 'sale',
      entityId: result.saleId,
      summary: `Venda #${result.saleNumber} · ${result.total.toFixed(2)}`,
    })
    revalidatePath('/vendas')
    revalidatePath('/caixa')
    revalidatePath('/estoque')
    revalidatePath('/produtos')
    revalidatePath('/comissoes')

    const message = result.cashRegisterOpen
      ? `Venda #${result.saleNumber} registrada.`
      : `Venda #${result.saleNumber} registrada. Nenhum caixa aberto: o pagamento não entrou no caixa.`
    return ok(message, { id: result.saleId })
  } catch (error) {
    return fail(error)
  }
}
