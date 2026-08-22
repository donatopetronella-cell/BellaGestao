import Link from 'next/link'
import type { Metadata } from 'next'
import { Check, CircleDashed } from 'lucide-react'
import { requireTenant } from '@/lib/auth/context'
import {
  getOnboardingProgress,
  getOpeningHours,
  getSalonSetup,
} from '@/features/settings/service'
import { SalonForm } from '@/features/settings/components/salon-form'
import { OpeningHoursForm } from '@/features/settings/components/opening-hours-form'
import { FinishOnboardingButton } from './finish-button'
import { PageHeader } from '@/components/layout/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Primeiros passos' }

export default async function OnboardingPage() {
  const context = await requireTenant()
  const [progress, setup, openingHours] = await Promise.all([
    getOnboardingProgress(context.tenant.id),
    getSalonSetup(context.tenant.id),
    getOpeningHours(context.tenant.id),
  ])

  const steps = [
    { label: 'Dados do salão', done: true, href: '#dados' },
    { label: 'Horários de funcionamento', done: progress.hasOpeningHours, href: '#horarios' },
    { label: 'Cadastrar profissionais', done: progress.hasProfessionals, href: '/profissionais' },
    { label: 'Cadastrar serviços', done: progress.hasServices, href: '/servicos' },
    { label: 'Configurar pagamentos', done: false, href: '/configuracoes/assinatura' },
    { label: 'Importar clientes', done: progress.hasClients, href: '/clientes' },
  ]

  const completed = steps.filter((step) => step.done).length
  const percent = (completed / steps.length) * 100

  return (
    <>
      <PageHeader
        title="Vamos configurar o seu salão"
        description="Sete passos rápidos para começar a agendar hoje mesmo."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Seu progresso</CardTitle>
            <CardDescription>
              {completed} de {steps.length} passos concluídos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={percent} label="Progresso do onboarding" />
            <ol className="space-y-2">
              {steps.map((step) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--muted)]',
                      step.done
                        ? 'text-[var(--foreground)]'
                        : 'text-[var(--muted-foreground)]',
                    )}
                  >
                    {step.done ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <CircleDashed className="size-4" />
                    )}
                    {step.label}
                  </Link>
                </li>
              ))}
            </ol>
            <FinishOnboardingButton completed={progress.completedAt !== null} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card id="dados">
            <CardHeader>
              <CardTitle>1. Dados do salão</CardTitle>
              <CardDescription>
                Nome, contato, fuso horário e regras de atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalonForm initial={setup} />
            </CardContent>
          </Card>

          <Card id="horarios">
            <CardHeader>
              <CardTitle>2. Horários de funcionamento</CardTitle>
              <CardDescription>
                Base para a agenda e para o agendamento online.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OpeningHoursForm initial={openingHours} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
