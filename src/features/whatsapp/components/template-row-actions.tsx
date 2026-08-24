'use client'

import { MoreHorizontal, Pencil, Power } from 'lucide-react'
import { useActionState, useEffect } from 'react'
import { toggleWhatsappTemplateAction } from '@/server/actions/whatsapp'
import { idleFormState } from '@/server/actions/types'
import type { WhatsappTemplateItem } from '../service'
import { TemplateDialog } from './template-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function TemplateRowActions({ template }: { template: WhatsappTemplateItem }) {
  const [toggleState, toggleAction] = useActionState(toggleWhatsappTemplateAction, idleFormState)

  useEffect(() => {
    if (toggleState.status === 'error') console.error(toggleState.message)
  }, [toggleState])

  return (
    <div className="flex items-center justify-end gap-1">
      <TemplateDialog
        template={template}
        trigger={
          <Button variant="ghost" size="icon" aria-label={`Editar ${template.name}`}>
            <Pencil className="size-4" />
          </Button>
        }
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Mais ações para ${template.name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <form action={toggleAction} className="w-full">
              <input type="hidden" name="templateId" value={template.id} />
              <input
                type="hidden"
                name="isActive"
                value={template.isActive ? 'false' : 'true'}
              />
              <button type="submit" className="flex w-full items-center gap-2">
                <Power className="size-4" />
                {template.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
