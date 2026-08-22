import type { Permission } from '@/lib/rbac'
import type { PlanFeature } from '@/config/plans'

/** Icon names resolved on the client by `nav-icons.ts`. */
export type NavIconName =
  | 'dashboard'
  | 'agenda'
  | 'clients'
  | 'professionals'
  | 'services'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'cash'
  | 'finance'
  | 'commissions'
  | 'marketing'
  | 'whatsapp'
  | 'loyalty'
  | 'reports'
  | 'ai'
  | 'settings'

export interface NavItem {
  href: string
  label: string
  icon: NavIconName
  /** Item is shown when the member holds at least one of these permissions. */
  permissions: Permission[]
  /** Item requires the plan to include this feature. */
  feature?: PlanFeature
  soon?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAVIGATION: NavSection[] = [
  {
    title: 'Operação',
    items: [
      {
        href: '/painel',
        label: 'Dashboard',
        icon: 'dashboard',
        permissions: ['dashboard.view'],
      },
      {
        href: '/agenda',
        label: 'Agenda',
        icon: 'agenda',
        permissions: ['agenda.view', 'agenda.view_own'],
      },
      {
        href: '/clientes',
        label: 'Clientes',
        icon: 'clients',
        permissions: ['clients.view'],
      },
      {
        href: '/profissionais',
        label: 'Profissionais',
        icon: 'professionals',
        permissions: ['professionals.view'],
      },
      {
        href: '/servicos',
        label: 'Serviços',
        icon: 'services',
        permissions: ['services.view'],
      },
    ],
  },
  {
    title: 'Comercial',
    items: [
      {
        href: '/produtos',
        label: 'Produtos',
        icon: 'products',
        permissions: ['products.view'],
        feature: 'inventory',
      },
      {
        href: '/estoque',
        label: 'Estoque',
        icon: 'inventory',
        permissions: ['inventory.view'],
        feature: 'inventory',
      },
      {
        href: '/vendas',
        label: 'Vendas',
        icon: 'sales',
        permissions: ['sales.view'],
      },
      {
        href: '/caixa',
        label: 'Caixa',
        icon: 'cash',
        permissions: ['cash.view'],
      },
    ],
  },
  {
    title: 'Gestão',
    items: [
      {
        href: '/financeiro',
        label: 'Financeiro',
        icon: 'finance',
        permissions: ['finance.view'],
      },
      {
        href: '/comissoes',
        label: 'Comissões',
        icon: 'commissions',
        permissions: ['commissions.view', 'commissions.view_own'],
        feature: 'commissions',
      },
      {
        href: '/marketing',
        label: 'Marketing',
        icon: 'marketing',
        permissions: ['marketing.view'],
        feature: 'crm',
      },
      {
        href: '/whatsapp',
        label: 'WhatsApp',
        icon: 'whatsapp',
        permissions: ['whatsapp.view'],
        feature: 'whatsapp',
      },
      {
        href: '/fidelidade',
        label: 'Fidelidade',
        icon: 'loyalty',
        permissions: ['loyalty.view'],
        feature: 'loyalty',
      },
      {
        href: '/relatorios',
        label: 'Relatórios',
        icon: 'reports',
        permissions: ['reports.view'],
      },
      {
        href: '/bella-ia',
        label: 'Bella IA',
        icon: 'ai',
        permissions: ['ai.use'],
        feature: 'ai',
      },
    ],
  },
  {
    title: 'Conta',
    items: [
      {
        href: '/configuracoes',
        label: 'Configurações',
        icon: 'settings',
        permissions: ['settings.view'],
      },
    ],
  },
]

export interface NavFilterContext {
  permissions: Set<Permission>
  planFeatures: readonly PlanFeature[]
}

/** Sidebar entries the current member may actually open. */
export function visibleNavigation(context: NavFilterContext): NavSection[] {
  return NAVIGATION.map((section) => ({
    title: section.title,
    items: section.items.filter((item) => {
      const allowed = item.permissions.some((permission) =>
        context.permissions.has(permission),
      )
      if (!allowed) return false
      if (item.feature && !context.planFeatures.includes(item.feature)) return false
      return true
    }),
  })).filter((section) => section.items.length > 0)
}
