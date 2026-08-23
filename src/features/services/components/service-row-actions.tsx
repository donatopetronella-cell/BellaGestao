'use client'

import { MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react'
import { useActionState, useEffect } from 'react'
import {
  archiveServiceAction,
  toggleServiceAction,
} from '@/server/actions/services'
import { idleFormState } from '@/server/actions/types'
import type { ServiceListItem } from '../service'
import { ServiceDialog, type ServiceDialogOption } from './service-dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ServiceRowActions({
  service,
  categories,
  professionals,
}: {
  service: ServiceListItem & { description?: string | null; categoryId?: string | null }
  categories: ServiceDialogOption[]
  professionals: ServiceDialogOption[]
}) {
  const [toggleState, toggleAction] = useActionState(
    toggleServiceAction,
    idleFormState,
  )

  useEffect(() => {
    if (toggleState.status === 'error') {
      console.error(toggleState.message)
    }
  }, [toggleState])

  return (
    <div className="flex items-center justify-end gap-1">
      <ServiceDialog
        service={service}
        categories={categories}
        professionals={professionals}
        trigger={
          <Button variant="ghost" size="icon" aria-label={`Editar ${service.name}`}>
            <Pencil className="size-4" />
          </Button>
        }
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Mais ações para ${service.name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <form action={toggleAction} className="w-full">
              <input type="hidden" name="serviceId" value={service.id} />
              <input
                type="hidden"
                name="isActive"
                value={service.isActive ? 'false' : 'true'}
              />
              <button type="submit" className="flex w-full items-center gap-2">
                <Power className="size-4" />
                {service.isActive ? 'Desativar' : 'Ativar'}
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
              title={`Remover ${service.name}?`}
              description="O histórico de atendimentos é preservado; o serviço deixa de aparecer no catálogo e na agenda."
              action={archiveServiceAction}
              hiddenFields={{ serviceId: service.id }}
              confirmLabel="Remover"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
