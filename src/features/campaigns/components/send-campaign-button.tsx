'use client'

import { Send } from 'lucide-react'
import { sendCampaignAction } from '@/server/actions/campaigns'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function SendCampaignButton({
  campaignId,
  campaignName,
  targetCount,
}: {
  campaignId: string
  campaignName: string
  targetCount: number
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          <Send className="size-4" /> Enviar
        </Button>
      }
      title={`Enviar "${campaignName}"?`}
      description={`A mensagem sai imediatamente para as clientes que casam com o público desta campanha (aproximadamente ${targetCount}).`}
      action={sendCampaignAction}
      hiddenFields={{ campaignId }}
      confirmLabel="Enviar agora"
      danger={false}
    />
  )
}
