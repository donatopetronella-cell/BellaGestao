import type { Metadata } from 'next'
import { CalendarDays } from 'lucide-react'
import { requireAnyPermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Agenda' }

export default async function AgendaPage() {
  await requireAnyPermission(['agenda.view', 'agenda.view_own'])

  return (
    <ModulePreview
      title="Agenda"
      description="Visão diária, semanal e mensal com profissionais em colunas."
      phase="Fase 2"
      icon={CalendarDays}
      ready={[
        'Tabela `appointments` com status, origem, horários e vínculo com cliente, profissional e unidade',
        'Tabela `appointment_services` com preço e duração por serviço executado',
        'Índices por tenant + data e por tenant + profissional + data',
        'Horários de funcionamento e jornada dos profissionais',
      ]}
      planned={[
        'Grade diária com profissionais em colunas e arrastar e soltar',
        'Criação, edição, reagendamento, duplicação e cancelamento',
        'Fluxo de status: aguardando, confirmado, chegou, em atendimento, finalizado',
        'Bloqueio de conflitos de horário e cálculo de horários livres',
      ]}
    />
  )
}
