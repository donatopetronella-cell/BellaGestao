import type { Metadata } from 'next'
import { MessageCircle } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { listWhatsappMessages, listWhatsappTemplates } from '@/features/whatsapp/service'
import { SendDialog } from '@/features/whatsapp/components/send-dialog'
import { TemplateDialog } from '@/features/whatsapp/components/template-dialog'
import { TemplateRowActions } from '@/features/whatsapp/components/template-row-actions'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'WhatsApp' }

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  QUEUED: 'default',
  SENT: 'default',
  DELIVERED: 'success',
  READ: 'success',
  FAILED: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  QUEUED: 'Na fila',
  SENT: 'Enviada',
  DELIVERED: 'Entregue',
  READ: 'Lida',
  FAILED: 'Falhou',
}

interface PageProps {
  searchParams: Promise<{ pagina?: string }>
}

export default async function WhatsappPage({ searchParams }: PageProps) {
  const context = await requirePermission('whatsapp.view')
  const params = await searchParams
  const canManage = context.permissions.has('whatsapp.manage')
  const canSend = context.permissions.has('whatsapp.send')
  const page = Math.max(1, Number(params.pagina ?? 1) || 1)

  const [templates, messages] = await Promise.all([
    listWhatsappTemplates(context.tenant.id),
    listWhatsappMessages(context.tenant.id, { page }),
  ])

  return (
    <>
      <PageHeader
        title="WhatsApp"
        description="Modelos de mensagem e histórico de envios."
        actions={
          <>
            {canSend ? <SendDialog templates={templates} /> : null}
            {canManage ? <TemplateDialog /> : null}
          </>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Modelos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="Nenhum modelo cadastrado"
              description="Crie modelos para confirmação, lembrete e aniversário."
              action={canManage ? <TemplateDialog /> : null}
              className="border-0"
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Modelo</TH>
                  <TH>Categoria</TH>
                  <TH className="text-right">Mensagens</TH>
                  {canManage ? <TH className="text-right">Ações</TH> : null}
                </TR>
              </THead>
              <TBody>
                {templates.map((template) => (
                  <TR key={template.id}>
                    <TD>
                      <span className="font-medium">{template.name}</span>
                      <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                        {template.code}
                      </span>
                      {!template.isActive ? (
                        <Badge variant="outline" className="ml-2">
                          Inativo
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">{template.category}</TD>
                    <TD className="text-right">{template.messageCount}</TD>
                    {canManage ? (
                      <TD>
                        <TemplateRowActions template={template} />
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensagens</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {messages.items.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="Nenhuma mensagem enviada ainda"
              description="O histórico de envios e status aparece aqui."
              className="border-0"
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Modelo</TH>
                  <TH>Status</TH>
                  <TH>Enviada em</TH>
                </TR>
              </THead>
              <TBody>
                {messages.items.map((message) => (
                  <TR key={message.id}>
                    <TD>
                      <span className="font-medium">{message.clientName ?? message.toPhone}</span>
                      <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                        {message.toPhone}
                      </span>
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {message.templateName ?? '—'}
                    </TD>
                    <TD>
                      <Badge variant={STATUS_VARIANT[message.status] ?? 'default'}>
                        {STATUS_LABEL[message.status] ?? message.status}
                      </Badge>
                      {message.error ? (
                        <span className="ml-2 text-xs text-danger">{message.error}</span>
                      ) : null}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {message.sentAt ? formatDateTime(message.sentAt) : '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={messages.page}
        perPage={messages.perPage}
        total={messages.total}
        buildHref={(nextPage) => `/whatsapp?pagina=${nextPage}`}
      />
    </>
  )
}
