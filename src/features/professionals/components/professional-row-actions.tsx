'use client'

import { Pencil, UserMinus } from 'lucide-react'
import { archiveProfessionalAction } from '@/server/actions/professionals'
import type { ProfessionalListItem } from '../service'
import { ProfessionalDialog } from './professional-dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function ProfessionalRowActions({
  professional,
}: {
  professional: ProfessionalListItem
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <ProfessionalDialog
        professional={professional}
        trigger={
          <Button variant="ghost" size="icon" aria-label={`Editar ${professional.name}`}>
            <Pencil className="size-4" />
          </Button>
        }
      />
      {professional.isActive ? (
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Desativar ${professional.name}`}
            >
              <UserMinus className="size-4" />
            </Button>
          }
          title={`Desativar ${professional.name}?`}
          description="O histórico e as comissões são mantidos. Atendimentos futuros precisam ser reagendados antes."
          action={archiveProfessionalAction}
          hiddenFields={{ professionalId: professional.id }}
          confirmLabel="Desativar"
        />
      ) : null}
    </div>
  )
}
