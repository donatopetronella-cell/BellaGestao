import type { MemberRole } from '@/generated/prisma/enums'

/**
 * Permission catalogue. This file is the single source of truth; the
 * `permissions` / `role_permissions` tables are synchronised from here by the
 * seed so an admin UI can read them later.
 */
export const PERMISSIONS = {
  'dashboard.view': { module: 'dashboard', description: 'Ver o painel' },

  'agenda.view': { module: 'agenda', description: 'Ver a agenda completa' },
  'agenda.view_own': { module: 'agenda', description: 'Ver a própria agenda' },
  'agenda.create': { module: 'agenda', description: 'Criar agendamentos' },
  'agenda.update': { module: 'agenda', description: 'Editar e reagendar' },
  'agenda.cancel': { module: 'agenda', description: 'Cancelar agendamentos' },
  'agenda.finish': { module: 'agenda', description: 'Finalizar atendimentos' },

  'clients.view': { module: 'clients', description: 'Ver clientes' },
  'clients.create': { module: 'clients', description: 'Cadastrar clientes' },
  'clients.update': { module: 'clients', description: 'Editar clientes' },
  'clients.delete': { module: 'clients', description: 'Excluir clientes' },
  'clients.export': { module: 'clients', description: 'Exportar dados de clientes' },
  'clients.hair_record.view': { module: 'clients', description: 'Ver ficha capilar' },
  'clients.hair_record.manage': { module: 'clients', description: 'Editar ficha capilar' },

  'professionals.view': { module: 'professionals', description: 'Ver profissionais' },
  'professionals.manage': { module: 'professionals', description: 'Gerenciar profissionais' },

  'services.view': { module: 'services', description: 'Ver serviços' },
  'services.manage': { module: 'services', description: 'Gerenciar serviços' },

  'products.view': { module: 'products', description: 'Ver produtos' },
  'products.manage': { module: 'products', description: 'Gerenciar produtos' },
  'inventory.view': { module: 'inventory', description: 'Ver estoque' },
  'inventory.manage': { module: 'inventory', description: 'Movimentar estoque' },

  'sales.view': { module: 'sales', description: 'Ver vendas' },
  'sales.create': { module: 'sales', description: 'Registrar vendas' },

  'cash.view': { module: 'cash', description: 'Ver o caixa' },
  'cash.open': { module: 'cash', description: 'Abrir caixa' },
  'cash.close': { module: 'cash', description: 'Fechar caixa' },
  'cash.move': { module: 'cash', description: 'Sangria e reforço' },

  'finance.view': { module: 'finance', description: 'Ver o financeiro' },
  'finance.manage': { module: 'finance', description: 'Lançar receitas e despesas' },

  'commissions.view': { module: 'commissions', description: 'Ver comissões da equipe' },
  'commissions.view_own': { module: 'commissions', description: 'Ver as próprias comissões' },
  'commissions.manage': { module: 'commissions', description: 'Fechar e pagar comissões' },

  'marketing.view': { module: 'marketing', description: 'Ver campanhas' },
  'marketing.manage': { module: 'marketing', description: 'Criar campanhas' },
  'whatsapp.view': { module: 'whatsapp', description: 'Ver mensagens' },
  'whatsapp.send': { module: 'whatsapp', description: 'Enviar mensagens' },
  'whatsapp.manage': { module: 'whatsapp', description: 'Configurar templates' },
  'loyalty.view': { module: 'loyalty', description: 'Ver fidelidade' },
  'loyalty.manage': { module: 'loyalty', description: 'Configurar fidelidade' },

  'reports.view': { module: 'reports', description: 'Ver relatórios' },
  'reports.export': { module: 'reports', description: 'Exportar relatórios' },

  'ai.use': { module: 'ai', description: 'Usar a Bella IA' },

  'team.view': { module: 'team', description: 'Ver a equipe' },
  'team.manage': { module: 'team', description: 'Convidar e remover usuários' },

  'settings.view': { module: 'settings', description: 'Ver configurações' },
  'settings.manage': { module: 'settings', description: 'Alterar configurações' },

  'billing.view': { module: 'billing', description: 'Ver a assinatura' },
  'billing.manage': { module: 'billing', description: 'Alterar plano e pagamento' },

  'audit.view': { module: 'audit', description: 'Ver o log de auditoria' },
} as const

export type Permission = keyof typeof PERMISSIONS

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[]

const RECEPTIONIST: Permission[] = [
  'dashboard.view',
  'agenda.view',
  'agenda.create',
  'agenda.update',
  'agenda.cancel',
  'agenda.finish',
  'clients.view',
  'clients.create',
  'clients.update',
  'clients.hair_record.view',
  'professionals.view',
  'services.view',
  'products.view',
  'inventory.view',
  'sales.view',
  'sales.create',
  'cash.view',
  'cash.open',
  'cash.close',
  'cash.move',
  'loyalty.view',
  'marketing.view',
  'whatsapp.view',
  'whatsapp.send',
]

const PROFESSIONAL: Permission[] = [
  'dashboard.view',
  'agenda.view_own',
  'agenda.update',
  'agenda.finish',
  'clients.view',
  'clients.update',
  'clients.hair_record.view',
  'clients.hair_record.manage',
  'services.view',
  'products.view',
  'commissions.view_own',
]

const FINANCE: Permission[] = [
  'dashboard.view',
  'agenda.view',
  'clients.view',
  'professionals.view',
  'services.view',
  'products.view',
  'inventory.view',
  'sales.view',
  'cash.view',
  'cash.open',
  'cash.close',
  'cash.move',
  'finance.view',
  'finance.manage',
  'commissions.view',
  'commissions.manage',
  'reports.view',
  'reports.export',
  'billing.view',
]

const MANAGER: Permission[] = ALL_PERMISSIONS.filter(
  (permission) => permission !== 'billing.manage' && permission !== 'audit.view',
)

export const ROLE_PERMISSIONS: Record<MemberRole, readonly Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  MANAGER: MANAGER,
  RECEPTIONIST: RECEPTIONIST,
  PROFESSIONAL: PROFESSIONAL,
  FINANCE: FINANCE,
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Proprietário',
  MANAGER: 'Gerente',
  RECEPTIONIST: 'Recepcionista',
  PROFESSIONAL: 'Profissional',
  FINANCE: 'Financeiro',
}
