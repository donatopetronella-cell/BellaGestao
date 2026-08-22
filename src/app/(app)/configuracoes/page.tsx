import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/auth/context'
import { getOpeningHours, getSalonSetup } from '@/features/settings/service'
import { SalonForm } from '@/features/settings/components/salon-form'
import { OpeningHoursForm } from '@/features/settings/components/opening-hours-form'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = { title: 'Configurações' }

export default async function SettingsPage() {
  const context = await requirePermission('settings.view')
  const [setup, openingHours] = await Promise.all([
    getSalonSetup(context.tenant.id),
    getOpeningHours(context.tenant.id),
  ])

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Dados do salão, horários e preferências de atendimento."
        actions={
          <Button asChild variant="outline">
            <Link href="/configuracoes/assinatura">Assinatura</Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados do salão</CardTitle>
            <CardDescription>
              Aparecem na agenda online e nas mensagens enviadas às clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalonForm initial={setup} />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Horários de funcionamento</CardTitle>
            <CardDescription>
              Definem a grade da agenda e os horários disponíveis online.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OpeningHoursForm initial={openingHours} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
