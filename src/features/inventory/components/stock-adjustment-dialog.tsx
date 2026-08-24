'use client'

import { PackagePlus } from 'lucide-react'
import { adjustStockAction } from '@/server/actions/inventory'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

const TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Entrada (compra)',
  RETURN: 'Entrada (devolução)',
  ADJUSTMENT: 'Ajuste (saída)',
  LOSS: 'Perda / quebra',
}

export function StockAdjustmentDialog({
  products,
}: {
  products: Array<{ id: string; name: string; unit: string; stock: number }>
}) {
  return (
    <FormDialog
      trigger={
        <Button>
          <PackagePlus className="size-4" /> Movimentar estoque
        </Button>
      }
      title="Movimentar estoque"
      description="Entradas de compra somam ao estoque; ajustes e perdas descontam."
      action={adjustStockAction}
      submitLabel="Registrar movimentação"
      className="max-w-md"
    >
      {(state) => (
        <>
          <FormField label="Produto" name="productId" error={state.fieldErrors?.productId}>
            <Select id="productId" name="productId" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — estoque atual: {product.stock} {product.unit}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Tipo de movimentação" name="type">
            <Select id="type" name="type" defaultValue="PURCHASE">
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Quantidade"
              name="quantity"
              error={state.fieldErrors?.quantity}
            >
              <Input id="quantity" name="quantity" type="number" min={0.001} step="0.001" required />
            </FormField>
            <FormField label="Custo unitário (R$)" name="unitCost" hint="Opcional, para entradas.">
              <Input id="unitCost" name="unitCost" type="number" min={0} step="0.01" />
            </FormField>
          </div>

          <FormField label="Motivo / observação" name="reason">
            <Input id="reason" name="reason" placeholder="Ex.: Nota fiscal 1234" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
