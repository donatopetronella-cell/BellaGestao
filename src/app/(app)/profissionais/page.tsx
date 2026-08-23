import type { Metadata } from 'next'
import Link from 'next/link'
import { UserSquare2 } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { listProfessionals } from '@/features/professionals/service'
import { ProfessionalDialog } from '@/features/professionals/components/professional-dialog'
import { ProfessionalRowActions } from '@/features/professionals/components/professional-row-actions'
import { PageHeader } from '@/components/layout/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatPercent } from '@/lib/utils'

export const metadata: Metadata = { title: 'Profissionais' }

export default async function ProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; inativos?: string }>
}) {
  const context = await requirePermission('professionals.view')
  const params = await searchParams
  const canManage = context.permissions.has('professionals.manage')

  const professionals = await listProfessionals(context.tenant.id, {
    search: params.busca,
    includeInactive: params.inativos === '1',
  })

  return (
    <>
      <PageHeader
        title="Profissionais"
        description="Equipe, jornada de trabalho, comissão e produtividade."
        actions={canManage ? <ProfessionalDialog /> : null}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar profissional…" />
        <Link
          href={params.inativos === '1' ? '/profissionais' : '/profissionais?inativos=1'}
          className="ml-auto rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
        >
          {params.inativos === '1' ? 'Ocultar inativos' : 'Mostrar inativos'}
        </Link>
      </div>

      {professionals.length === 0 ? (
        <EmptyState
          icon={UserSquare2}
          title="Nenhum profissional cadastrado"
          description="Cadastre sua equipe para montar a agenda e calcular comissões."
          action={canManage ? <ProfessionalDialog /> : null}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Profissional</TH>
                  <TH>Especialidade</TH>
                  <TH>Contato</TH>
                  <TH className="text-right">Comissão</TH>
                  <TH className="text-right">Serviços</TH>
                  {canManage ? <TH className="text-right">Ações</TH> : null}
                </TR>
              </THead>
              <TBody>
                {professionals.map((professional) => (
                  <TR key={professional.id}>
                    <TD>
                      <Link
                        href={`/profissionais/${professional.id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar name={professional.name} />
                        <span>
                          <span className="font-medium">{professional.name}</span>
                          {!professional.isActive ? (
                            <Badge variant="outline" className="ml-2">
                              Inativo
                            </Badge>
                          ) : null}
                          {professional.hasSystemAccess ? (
                            <Badge variant="default" className="ml-2">
                              Acesso ao sistema
                            </Badge>
                          ) : null}
                        </span>
                      </Link>
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {professional.specialty ?? '—'}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {professional.phone ?? professional.email ?? '—'}
                    </TD>
                    <TD className="text-right">
                      {formatPercent(professional.commissionPercent, 0)}
                    </TD>
                    <TD className="text-right">{professional.serviceCount}</TD>
                    {canManage ? (
                      <TD>
                        <ProfessionalRowActions professional={professional} />
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
