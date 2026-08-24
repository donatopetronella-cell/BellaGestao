'use client'

import { MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react'
import { useActionState, useEffect } from 'react'
import { archiveProductAction, toggleProductAction } from '@/server/actions/products'
import { idleFormState } from '@/server/actions/types'
import type { ProductListItem } from '../service'
import { ProductDialog, type ProductDialogOption } from './product-dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ProductRowActions({
  product,
  categories,
  suppliers,
}: {
  product: ProductListItem & { categoryId?: string | null; supplierId?: string | null }
  categories: ProductDialogOption[]
  suppliers: ProductDialogOption[]
}) {
  const [toggleState, toggleAction] = useActionState(toggleProductAction, idleFormState)

  useEffect(() => {
    if (toggleState.status === 'error') {
      console.error(toggleState.message)
    }
  }, [toggleState])

  return (
    <div className="flex items-center justify-end gap-1">
      <ProductDialog
        product={product}
        categories={categories}
        suppliers={suppliers}
        trigger={
          <Button variant="ghost" size="icon" aria-label={`Editar ${product.name}`}>
            <Pencil className="size-4" />
          </Button>
        }
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Mais ações para ${product.name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <form action={toggleAction} className="w-full">
              <input type="hidden" name="productId" value={product.id} />
              <input
                type="hidden"
                name="isActive"
                value={product.isActive ? 'false' : 'true'}
              />
              <button type="submit" className="flex w-full items-center gap-2">
                <Power className="size-4" />
                {product.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </form>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <ConfirmDialog
              trigger={
                <button type="button" className="flex w-full items-center gap-2 text-danger">
                  <Trash2 className="size-4" /> Remover do catálogo
                </button>
              }
              title={`Remover ${product.name}?`}
              description="O histórico de vendas e movimentações de estoque é preservado; o produto deixa de aparecer no catálogo e no PDV."
              action={archiveProductAction}
              hiddenFields={{ productId: product.id }}
              confirmLabel="Remover"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
