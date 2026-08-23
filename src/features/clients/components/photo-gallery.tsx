'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Trash2 } from 'lucide-react'
import {
  deleteClientPhotoAction,
  uploadClientPhotoAction,
} from '@/server/actions/clients'
import { idleFormState } from '@/server/actions/types'
import type { ClientPhotoRow } from '../service'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import { formatDate } from '@/lib/utils'

const KIND_LABELS: Record<string, string> = {
  BEFORE: 'Antes',
  AFTER: 'Depois',
  OTHER: 'Registro',
}

export function PhotoGallery({
  clientId,
  photos,
  canManage,
  timeZone,
}: {
  clientId: string
  photos: ClientPhotoRow[]
  canManage: boolean
  timeZone: string
}) {
  const [state, formAction] = useActionState(uploadClientPhotoAction, idleFormState)
  const [fileName, setFileName] = useState('')

  return (
    <div className="space-y-5">
      {canManage ? (
        <form
          action={formAction}
          className="space-y-3 rounded-xl2 border border-dashed border-[var(--border)] p-4"
        >
          <input type="hidden" name="clientId" value={clientId} />

          {state.status === 'error' ? (
            <Alert variant="error">{state.message}</Alert>
          ) : null}
          {state.status === 'success' ? (
            <Alert variant="success">{state.message}</Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <FormField label="Imagem" name="photo" hint="JPG, PNG, WEBP ou AVIF até 8 MB.">
              <Input
                id="photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
                required
                className="file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1 file:text-xs"
              />
            </FormField>

            <FormField label="Momento" name="kind">
              <Select id="kind" name="kind" defaultValue="BEFORE">
                <option value="BEFORE">Antes</option>
                <option value="AFTER">Depois</option>
                <option value="OTHER">Registro</option>
              </Select>
            </FormField>

            <div className="flex items-end">
              <SubmitButton>
                <ImagePlus className="size-4" /> Enviar
              </SubmitButton>
            </div>
          </div>

          <Input name="caption" placeholder="Legenda (opcional)" />
          {fileName ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Selecionado: {fileName}
            </p>
          ) : null}
        </form>
      ) : null}

      {photos.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Nenhuma foto registrada ainda. As fotos antes e depois ficam guardadas com
          acesso restrito à equipe do salão.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="overflow-hidden rounded-xl2 border border-[var(--border)]"
            >
              <div className="relative aspect-4/3 bg-[var(--muted)]">
                <Image
                  src={photo.url}
                  alt={photo.caption ?? KIND_LABELS[photo.kind] ?? 'Foto da cliente'}
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex items-start justify-between gap-2 p-3">
                <div>
                  <Badge variant={photo.kind === 'AFTER' ? 'success' : 'outline'}>
                    {KIND_LABELS[photo.kind] ?? 'Registro'}
                  </Badge>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {formatDate(photo.takenAt, timeZone)}
                    {photo.caption ? ` · ${photo.caption}` : ''}
                  </p>
                </div>
                {canManage ? (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Remover foto">
                        <Trash2 className="size-4" />
                      </Button>
                    }
                    title="Remover foto?"
                    description="A imagem é apagada do armazenamento e não pode ser recuperada."
                    action={deleteClientPhotoAction}
                    hiddenFields={{ photoId: photo.id, clientId }}
                    confirmLabel="Remover"
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
