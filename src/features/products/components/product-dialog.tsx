'use client'

import { Plus } from 'lucide-react'
import { createProductAction, updateProductAction } from '@/server/actions/products'
import type { ProductListItem } from '../service'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export interface ProductDialogOption {
  id: string
  name: string
}

export function ProductDialog({
  product,
  categories,
  suppliers,
  trigger,
}: {
  product?: ProductListItem & { categoryId?: string | null; supplierId?: string | null }
  categories: ProductDialogOption[]
  suppliers: ProductDialogOption[]
  trigger?: React.ReactNode
}) {
  const editing = product !== undefined

  return (
    <FormDialog
      trigger={
        trigger ?? (
          <Button>
            <Plus className="size-4" /> Novo produto
          </Button>
        )
      }
      title={editing ? 'Editar produto' : 'Novo produto'}
      description="Preço, custo e estoque mínimo alimentam o PDV e os alertas de estoque."
      action={editing ? updateProductAction : createProductAction}
      submitLabel={editing ? 'Salvar alterações' : 'Criar produto'}
      className="max-w-2xl"
    >
      {(state) => (
        <>
          {editing ? <input type="hidden" name="productId" value={product.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Nome"
              name="name"
              error={state.fieldErrors?.name}
              className="sm:col-span-2"
            >
              <Input
                id="name"
                name="name"
                defaultValue={product?.name}
                placeholder="Ex.: Shampoo hidratante 300ml"
                required
              />
            </FormField>

            <FormField label="Categoria" name="categoryId">
              <Select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ''}>
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Fornecedor" name="supplierId">
              <Select id="supplierId" name="supplierId" defaultValue={product?.supplierId ?? ''}>
                <option value="">Sem fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Marca" name="brand">
              <Input id="brand" name="brand" defaultValue={product?.brand ?? ''} />
            </FormField>

            <FormField label="SKU" name="sku" error={state.fieldErrors?.sku}>
              <Input id="sku" name="sku" defaultValue={product?.sku ?? ''} />
            </FormField>

            <FormField label="Código de barras" name="barcode">
              <Input id="barcode" name="barcode" defaultValue={product?.barcode ?? ''} />
            </FormField>

            <FormField label="Unidade" name="unit">
              <Input
                id="unit"
                name="unit"
                defaultValue={product?.unit ?? 'un'}
                placeholder="un, ml, kg…"
              />
            </FormField>

            <FormField label="Custo (R$)" name="cost">
              <Input
                id="cost"
                name="cost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={product?.cost ?? 0}
              />
            </FormField>

            <FormField label="Preço de venda (R$)" name="price" error={state.fieldErrors?.price}>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={product?.price ?? ''}
                required
              />
            </FormField>

            <FormField
              label="Estoque mínimo"
              name="minStock"
              hint="Dispara o alerta de reposição."
            >
              <Input
                id="minStock"
                name="minStock"
                type="number"
                min={0}
                step="0.001"
                defaultValue={product?.minStock ?? 0}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isForSale"
                defaultChecked={product?.isForSale ?? true}
              />
              Vendido no PDV
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isSupply" defaultChecked={product?.isSupply ?? false} />
              Usado como insumo de serviço
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} />
              Produto ativo
            </label>
          </div>
        </>
      )}
    </FormDialog>
  )
}
