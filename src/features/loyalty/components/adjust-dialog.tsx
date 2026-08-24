'use client'

import { useState } from 'react'
import { Coins } from 'lucide-react'
import { adjustLoyaltyAccountAction } from '@/server/actions/loyalty'
import { ClientPicker, type PickedClient } from '@/features/appointments/components/client-picker'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function AdjustDialog() {
  const [client, setClient] = useState<PickedClient | null>(null)

  return (
    <FormDialog
      trigger={
        <Button variant="outline">
          <Coins className="size-4" /> Lançar pontos
        </Button>
      }
      title="Lançar pontos"
      description="Crédito, resgate ou ajuste manual no saldo da cliente."
      action={adjustLoyaltyAccountAction}
      submitLabel="Registrar"
      onSuccess={() => setClient(null)}
    >
      {(state) => (
        <>
          <ClientPicker value={client} onChange={setClient} error={state.fieldErrors?.clientId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tipo" name="type">
              <Select id="type" name="type" defaultValue="EARN">
                <option value="EARN">Crédito</option>
                <option value="REDEEM">Resgate</option>
                <option value="ADJUST">Ajuste</option>
              </Select>
            </FormField>

            <FormField label="Pontos" name="points" error={state.fieldErrors?.points}>
              <Input id="points" name="points" type="number" min={0} step={1} required />
            </FormField>
          </div>

          <FormField label="Observação" name="description">
            <Input id="description" name="description" placeholder="Ex.: resgate no caixa" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
