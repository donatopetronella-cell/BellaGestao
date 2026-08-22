import type { Metadata } from 'next'
import { UserSquare2 } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Profissionais' }

export default async function ProfissionaisPage() {
  await requirePermission('professionals.view')

  return (
    <ModulePreview
      title="Profissionais"
      description="Equipe, jornada de trabalho, produtividade e comissões."
      phase="Fase 2"
      icon={UserSquare2}
      ready={[
        'Tabela `professionals` com especialidade, comissão padrão e status',
        'Tabela `professional_working_hours` com jornada e intervalo',
        'Tabela `professional_time_off` para folgas e ausências',
        'Vínculo opcional com um usuário do sistema (perfil Profissional)',
      ]}
      planned={[
        'Cadastro completo com foto e jornada por dia da semana',
        'Painel individual com faturamento, ticket médio e produtividade',
        'Serviços habilitados e preço por profissional',
        'Convite de acesso ao sistema para o profissional',
      ]}
    />
  )
}
