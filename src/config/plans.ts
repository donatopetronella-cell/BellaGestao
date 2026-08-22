/**
 * Commercial catalogue. Prices live in the `plans` table (editable without a
 * deploy); this file describes the feature flags each plan code unlocks and is
 * used to seed/refresh that table.
 */
export const PLAN_FEATURES = [
  'agenda',
  'clients',
  'services',
  'cash',
  'reports_basic',
  'inventory',
  'commissions',
  'whatsapp',
  'online_booking',
  'reports_advanced',
  'loyalty',
  'crm',
  'ai',
  'multi_branch',
  'automations',
] as const

export type PlanFeature = (typeof PLAN_FEATURES)[number]

export interface PlanDefinition {
  code: 'essencial' | 'profissional' | 'premium'
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  trialDays: number
  sortOrder: number
  highlights: string[]
  features: PlanFeature[]
  limits: {
    branches: number
    professionals: number
    users: number
    whatsappMessagesPerMonth: number
    aiQuestionsPerMonth: number
  }
}

const ESSENCIAL_FEATURES: PlanFeature[] = [
  'agenda',
  'clients',
  'services',
  'cash',
  'reports_basic',
]

const PROFISSIONAL_FEATURES: PlanFeature[] = [
  ...ESSENCIAL_FEATURES,
  'inventory',
  'commissions',
  'whatsapp',
  'online_booking',
  'reports_advanced',
  'loyalty',
]

const PREMIUM_FEATURES: PlanFeature[] = [
  ...PROFISSIONAL_FEATURES,
  'crm',
  'ai',
  'multi_branch',
  'automations',
]

export const PLANS: PlanDefinition[] = [
  {
    code: 'essencial',
    name: 'Essencial',
    description: 'Para quem está começando a organizar a agenda e o caixa.',
    priceMonthly: 49,
    priceYearly: 490,
    trialDays: 14,
    sortOrder: 1,
    highlights: ['Agenda inteligente', 'Cadastro de clientes', 'Serviços', 'Caixa'],
    features: ESSENCIAL_FEATURES,
    limits: {
      branches: 1,
      professionals: 3,
      users: 3,
      whatsappMessagesPerMonth: 0,
      aiQuestionsPerMonth: 0,
    },
  },
  {
    code: 'profissional',
    name: 'Profissional',
    description: 'Para salões que querem vender mais e fidelizar clientes.',
    priceMonthly: 99,
    priceYearly: 990,
    trialDays: 14,
    sortOrder: 2,
    highlights: [
      'Tudo do Essencial',
      'Estoque e comissões',
      'WhatsApp e agenda online',
      'Relatórios completos',
    ],
    features: PROFISSIONAL_FEATURES,
    limits: {
      branches: 1,
      professionals: 15,
      users: 10,
      whatsappMessagesPerMonth: 2000,
      aiQuestionsPerMonth: 0,
    },
  },
  {
    code: 'premium',
    name: 'Premium',
    description: 'Para redes e studios que querem crescer com inteligência.',
    priceMonthly: 199,
    priceYearly: 1990,
    trialDays: 14,
    sortOrder: 3,
    highlights: [
      'Tudo do Profissional',
      'Bella IA e insights',
      'Multiunidade',
      'CRM e automações',
    ],
    features: PREMIUM_FEATURES,
    limits: {
      branches: 10,
      professionals: 100,
      users: 50,
      whatsappMessagesPerMonth: 20000,
      aiQuestionsPerMonth: 1000,
    },
  },
]

export const TRIAL_DAYS = 14

export function planByCode(code: string): PlanDefinition | undefined {
  return PLANS.find((plan) => plan.code === code)
}

export function planHasFeature(code: string, feature: PlanFeature): boolean {
  return planByCode(code)?.features.includes(feature) ?? false
}
