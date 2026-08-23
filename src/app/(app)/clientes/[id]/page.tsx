import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarPlus, Cake, MessageCircle } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import {
  getClient,
  getHairProfile,
  listChemicalRecords,
  listClientPhotos,
  listFormulas,
} from '@/features/clients/service'
import { listProfessionals } from '@/features/professionals/service'
import { ClientDialog } from '@/features/clients/components/client-dialog'
import { HairProfileForm } from '@/features/clients/components/hair-profile-form'
import { ChemicalRecordDialog } from '@/features/clients/components/chemical-record-dialog'
import { PhotoGallery } from '@/features/clients/components/photo-gallery'
import { AppointmentStatusBadge } from '@/features/dashboard/components/appointment-status-badge'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { PROCEDURE_LABELS } from '@/validators/client'
import { AppError } from '@/lib/errors'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency, formatDate, formatTime, normalizePhone } from '@/lib/utils'

export const metadata: Metadata = { title: 'Cliente' }

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const context = await requirePermission('clients.view')
  const { id } = await params

  let client
  try {
    client = await getClient(context.tenant.id, id)
  } catch (error) {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound()
    throw error
  }

  const canSeeHairRecord = context.permissions.has('clients.hair_record.view')
  const canManageHairRecord = context.permissions.has('clients.hair_record.manage')
  const canUpdate = context.permissions.has('clients.update')

  const [profile, chemicalRecords, photos, formulas, professionals] = await Promise.all([
    canSeeHairRecord ? getHairProfile(context.tenant.id, id) : Promise.resolve(null),
    canSeeHairRecord ? listChemicalRecords(context.tenant.id, id) : Promise.resolve([]),
    canSeeHairRecord ? listClientPhotos(context.tenant.id, id) : Promise.resolve([]),
    canManageHairRecord ? listFormulas(context.tenant.id, id) : Promise.resolve([]),
    listProfessionals(context.tenant.id),
  ])

  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
  }))

  const timeZone = context.tenant.timezone
  const whatsappNumber = normalizePhone(client.whatsapp ?? client.phone ?? '')

  return (
    <>
      <Link
        href="/clientes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" /> Clientes
      </Link>

      <PageHeader
        title={client.name}
        description={[
          client.whatsapp ?? client.phone,
          client.email,
          client.preferredProfessionalName
            ? `Prefere ${client.preferredProfessionalName}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <>
            {whatsappNumber ? (
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/55${whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </Button>
            ) : null}
            {context.permissions.has('agenda.create') ? (
              <Button asChild variant="outline">
                <Link href={`/agenda?cliente=${client.id}`}>
                  <CalendarPlus className="size-4" /> Agendar
                </Link>
              </Button>
            ) : null}
            {canUpdate ? (
              <ClientDialog
                client={client}
                professionals={professionalOptions}
                trigger={<Button>Editar</Button>}
              />
            ) : null}
          </>
        }
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total gasto" value={formatCurrency(client.metrics.totalSpent)} />
        <StatCard
          label="Ticket médio"
          value={formatCurrency(client.metrics.averageTicket)}
          hint={`${client.metrics.visits} atendimento(s)`}
        />
        <StatCard
          label="Frequência"
          value={
            client.metrics.averageIntervalDays
              ? `${client.metrics.averageIntervalDays} dias`
              : '—'
          }
          hint={
            client.metrics.lastVisitAt
              ? `Última visita em ${formatDate(client.metrics.lastVisitAt, timeZone)}`
              : 'Sem visitas registradas'
          }
        />
        <StatCard
          label="Retorno previsto"
          value={
            client.metrics.expectedReturnAt
              ? formatDate(client.metrics.expectedReturnAt, timeZone)
              : '—'
          }
          hint={`${client.metrics.cancellations} cancelamento(s) · ${client.metrics.noShows} falta(s)`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Telefone" value={client.phone} />
              <Row label="WhatsApp" value={client.whatsapp} />
              <Row label="E-mail" value={client.email} />
              <Row
                label="Aniversário"
                value={
                  client.birthDate
                    ? formatDate(client.birthDate, 'UTC')
                    : null
                }
                icon={client.birthDate ? <Cake className="size-3.5" /> : undefined}
              />
              <Row label="CPF" value={client.document} />
              <Row
                label="Endereço"
                value={
                  [client.street, client.number, client.district, client.city]
                    .filter(Boolean)
                    .join(', ') || null
                }
              />
              <Row label="Origem" value={client.source} />
              <Row
                label="Cadastro"
                value={formatDate(client.createdAt, timeZone)}
              />
              <Row label="Pontos de fidelidade" value={String(client.loyaltyPoints)} />
              <div className="pt-1">
                <Badge variant={client.marketingConsent ? 'success' : 'outline'}>
                  {client.marketingConsent
                    ? 'Autoriza mensagens'
                    : 'Sem consentimento de marketing'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {client.preferences || client.allergies || client.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Preferências e observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {client.allergies ? (
                  <div className="rounded-lg border border-danger/30 bg-danger/8 p-3 text-danger">
                    <p className="text-xs font-medium uppercase tracking-wide">Alergias</p>
                    <p>{client.allergies}</p>
                  </div>
                ) : null}
                {client.preferences ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                      Preferências
                    </p>
                    <p>{client.preferences}</p>
                  </div>
                ) : null}
                {client.notes ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                      Observações
                    </p>
                    <p>{client.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Tabs defaultValue="historico">
          <TabsList>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            {canSeeHairRecord ? (
              <>
                <TabsTrigger value="ficha">Ficha capilar</TabsTrigger>
                <TabsTrigger value="quimico">Histórico químico</TabsTrigger>
                <TabsTrigger value="fotos">Fotos</TabsTrigger>
              </>
            ) : null}
          </TabsList>

          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle>Atendimentos</CardTitle>
                <CardDescription>
                  Últimos {client.appointments.length} registros.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {client.appointments.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Nenhum atendimento registrado.
                  </p>
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Data</TH>
                        <TH>Serviços</TH>
                        <TH>Profissional</TH>
                        <TH>Status</TH>
                        <TH className="text-right">Valor</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {client.appointments.map((appointment) => (
                        <TR key={appointment.id}>
                          <TD>
                            {formatDate(appointment.startsAt, timeZone)}
                            <span className="block text-xs text-[var(--muted-foreground)]">
                              {formatTime(appointment.startsAt, timeZone)}
                            </span>
                          </TD>
                          <TD>{appointment.services.join(', ') || '—'}</TD>
                          <TD className="text-[var(--muted-foreground)]">
                            {appointment.professionalName}
                          </TD>
                          <TD>
                            <AppointmentStatusBadge status={appointment.status} />
                          </TD>
                          <TD className="text-right">
                            {formatCurrency(appointment.total)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canSeeHairRecord ? (
            <>
              <TabsContent value="ficha">
                <Card>
                  <CardHeader>
                    <CardTitle>Ficha capilar</CardTitle>
                    <CardDescription>
                      Tipo, curvatura, condição e restrições da cliente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HairProfileForm
                      clientId={client.id}
                      profile={profile}
                      readOnly={!canManageHairRecord}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="quimico">
                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle>Histórico químico</CardTitle>
                      <CardDescription>
                        Fórmula, oxidante e tempo de pausa de cada procedimento.
                      </CardDescription>
                    </div>
                    {canManageHairRecord ? (
                      <ChemicalRecordDialog
                        clientId={client.id}
                        professionals={professionalOptions}
                        formulas={formulas}
                      />
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    {chemicalRecords.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Nenhum procedimento químico registrado.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {chemicalRecords.map((record) => (
                          <li
                            key={record.id}
                            className="rounded-xl2 border border-[var(--border)] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium">
                                {PROCEDURE_LABELS[
                                  record.procedure as keyof typeof PROCEDURE_LABELS
                                ] ?? record.procedure}
                                {record.brand ? ` · ${record.brand}` : ''}
                                {record.productName ? ` ${record.productName}` : ''}
                              </p>
                              <Badge variant="outline">
                                {formatDate(record.performedAt, 'UTC')}
                              </Badge>
                            </div>

                            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                              <div className="sm:col-span-2">
                                <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                                  Fórmula
                                </dt>
                                <dd>
                                  {record.items.length > 0
                                    ? record.items
                                        .map((item) => `${item.tone} — ${item.grams} g`)
                                        .join(' · ')
                                    : '—'}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                                  Oxidante
                                </dt>
                                <dd>
                                  {record.oxidantVolume
                                    ? `${record.oxidantVolume} vol`
                                    : '—'}
                                  {record.oxidantMl ? ` · ${record.oxidantMl} ml` : ''}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                                  Pausa
                                </dt>
                                <dd>
                                  {record.pauseMinutes ? `${record.pauseMinutes} min` : '—'}
                                </dd>
                              </div>
                            </dl>

                            {record.result || record.professionalName ? (
                              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                                {record.result ? `${record.result}. ` : ''}
                                {record.professionalName
                                  ? `Profissional: ${record.professionalName}.`
                                  : ''}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fotos">
                <Card>
                  <CardHeader>
                    <CardTitle>Antes e depois</CardTitle>
                    <CardDescription>
                      Evolução do cabelo, com acesso restrito à equipe do salão.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PhotoGallery
                      clientId={client.id}
                      photos={photos}
                      canManage={canManageHairRecord}
                      timeZone={timeZone}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          ) : null}
        </Tabs>
      </div>
    </>
  )
}

function Row({
  label,
  value,
  icon,
}: {
  label: string
  value?: string | null
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {icon}
        {value?.trim() ? value : '—'}
      </span>
    </div>
  )
}
