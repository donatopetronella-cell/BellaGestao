import type { Metadata } from 'next'
import { Megaphone } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { listCampaigns } from '@/features/campaigns/service'
import { listWhatsappTemplates } from '@/features/whatsapp/service'
import { CampaignDialog } from '@/features/campaigns/components/campaign-dialog'
import { SendCampaignButton } from '@/features/campaigns/components/send-campaign-button'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Marketing' }

const TYPE_LABEL: Record<string, string> = {
  REACTIVATION: 'Reativação',
  BIRTHDAY: 'Aniversário',
  PROMOTION: 'Promoção',
  REMINDER: 'Lembrete',
  CUSTOM: 'Toda a base',
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'default',
  SCHEDULED: 'warning',
  RUNNING: 'warning',
  FINISHED: 'success',
  CANCELED: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendada',
  RUNNING: 'Enviando',
  FINISHED: 'Enviada',
  CANCELED: 'Cancelada',
}

export default async function MarketingPage() {
  const context = await requirePermission('marketing.view')
  const canManage = context.permissions.has('marketing.manage')

  const [campaigns, templates] = await Promise.all([
    listCampaigns(context.tenant.id),
    listWhatsappTemplates(context.tenant.id),
  ])
  const activeTemplates = templates.filter((template) => template.isActive)

  return (
    <>
      <PageHeader
        title="Marketing"
        description="Campanhas, recuperação de clientes e aniversariantes."
        actions={canManage ? <CampaignDialog templates={activeTemplates} /> : null}
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhuma campanha criada"
          description={
            canManage
              ? 'Crie uma campanha de reativação ou de aniversariantes.'
              : 'Peça a quem administra o salão para criar uma campanha.'
          }
          action={canManage ? <CampaignDialog templates={activeTemplates} /> : null}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Campanha</TH>
                  <TH>Público</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Enviadas</TH>
                  <TH>Data</TH>
                  {canManage ? <TH className="text-right">Ações</TH> : null}
                </TR>
              </THead>
              <TBody>
                {campaigns.map((campaign) => (
                  <TR key={campaign.id}>
                    <TD>
                      <span className="font-medium">{campaign.name}</span>
                      <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                        {campaign.templateName ?? '—'}
                      </span>
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {TYPE_LABEL[campaign.type] ?? campaign.type}
                    </TD>
                    <TD>
                      <Badge variant={STATUS_VARIANT[campaign.status] ?? 'default'}>
                        {STATUS_LABEL[campaign.status] ?? campaign.status}
                      </Badge>
                    </TD>
                    <TD className="text-right">{campaign.sentCount}</TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {campaign.finishedAt
                        ? formatDateTime(campaign.finishedAt)
                        : campaign.startedAt
                          ? formatDateTime(campaign.startedAt)
                          : '—'}
                    </TD>
                    {canManage ? (
                      <TD>
                        {campaign.status === 'DRAFT' ? (
                          <SendCampaignButton
                            campaignId={campaign.id}
                            campaignName={campaign.name}
                            targetCount={campaign.targetCount}
                          />
                        ) : null}
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  )
}
