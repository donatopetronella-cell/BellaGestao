import type { Metadata } from 'next'
import { Users } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Clientes' }

export default async function ClientesPage() {
  await requirePermission('clients.view')

  return (
    <ModulePreview
      title="Clientes"
      description="CRM com histórico, ficha capilar, histórico químico e fotos."
      phase="Fase 2"
      icon={Users}
      ready={[
        'Tabela `clients` com contato, aniversário, preferências, alergias e consentimento LGPD',
        'Tabela `client_hair_profiles` (ficha capilar)',
        'Tabela `chemical_history` com fórmula, oxidante, volume e tempo de pausa',
        'Tabelas `hair_formulas` e `client_photos` (antes/depois)',
      ]}
      planned={[
        'Listagem com busca instantânea, filtros e paginação',
        'Ficha do cliente com histórico de atendimentos e gastos',
        'Ficha capilar e histórico químico com reutilização de fórmula',
        'Importação de clientes por CSV e Excel com validação',
      ]}
    />
  )
}
