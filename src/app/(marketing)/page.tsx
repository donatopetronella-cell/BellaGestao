import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  Check,
  MessageCircle,
  Percent,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/layout/logo'
import { listPublicPlans } from '@/features/billing/queries'
import { TRIAL_DAYS } from '@/config/plans'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const BENEFITS = [
  {
    icon: CalendarDays,
    title: 'Agenda que trabalha por você',
    description:
      'Visão diária, semanal e mensal, profissionais em colunas, arrastar e soltar, status de cada atendimento e confirmação automática.',
  },
  {
    icon: Users,
    title: 'CRM com ficha capilar',
    description:
      'Histórico de atendimentos, preferências, alergias, fotos antes e depois, histórico químico e fórmulas reaproveitáveis.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp integrado',
    description:
      'Confirmação, lembrete 24h e 2h antes, aniversários e campanhas de recuperação de clientes inativos.',
  },
  {
    icon: Wallet,
    title: 'Financeiro sem planilha',
    description:
      'Caixa, receitas, despesas, formas de pagamento, fluxo de caixa e relatórios exportáveis.',
  },
  {
    icon: Boxes,
    title: 'Estoque com baixa automática',
    description:
      'Insumos vinculados aos serviços: ao finalizar as mechas, o descolorante sai do estoque sozinho.',
  },
  {
    icon: Percent,
    title: 'Comissões calculadas',
    description:
      'Percentual, valor fixo, por serviço ou por profissional, com fechamento mensal pronto para pagar.',
  },
]

const DIFFERENTIALS = [
  'Ficha capilar completa por cliente',
  'Histórico químico com fórmula, oxidante e tempo de pausa',
  'Galeria antes e depois',
  'Recuperação automática de clientes inativos',
  'Programa de fidelidade com pontos ou cashback',
  'Página pública de agendamento online',
]

const TESTIMONIALS = [
  {
    quote:
      'A ficha capilar mudou nosso atendimento. Qualquer profissional consegue repetir a cor exata da cliente.',
    author: 'Ana Prado',
    role: 'Bella Hair Studio',
  },
  {
    quote:
      'A campanha de reativação trouxe 38 clientes de volta em duas semanas. O sistema se pagou no primeiro mês.',
    author: 'Juliana Moraes',
    role: 'Studio JM Beauty',
  },
  {
    quote:
      'Fechar comissão levava um dia inteiro. Hoje eu abro o relatório e pago.',
    author: 'Camila Nunes',
    role: 'Espaço Camila',
  },
]

const FAQ = [
  {
    question: 'Preciso de cartão de crédito para testar?',
    answer: `Não. O teste de ${TRIAL_DAYS} dias é liberado no cadastro, com todos os recursos do plano escolhido.`,
  },
  {
    question: 'Meus dados ficam separados dos outros salões?',
    answer:
      'Sim. Cada salão é um ambiente isolado, com separação garantida no próprio banco de dados por políticas de acesso por linha (RLS).',
  },
  {
    question: 'Consigo migrar minha lista de clientes?',
    answer:
      'Sim. A importação aceita CSV e Excel com nome, telefone, e-mail e aniversário, com validação antes de gravar.',
  },
  {
    question: 'Funciona no celular?',
    answer:
      'Funciona em computador, tablet e celular, e pode ser instalado como aplicativo (PWA) na tela inicial.',
  },
  {
    question: 'E a LGPD?',
    answer:
      'A plataforma registra consentimento, permite exportar e anonimizar dados de clientes e mantém log de auditoria das ações.',
  },
]

export default async function LandingPage() {
  const plans = await listPublicPlans()

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-[var(--muted-foreground)] md:flex">
            <a href="#recursos" className="hover:text-[var(--foreground)]">Recursos</a>
            <a href="#planos" className="hover:text-[var(--foreground)]">Planos</a>
            <a href="#duvidas" className="hover:text-[var(--foreground)]">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/entrar">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/cadastrar">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-40 size-[32rem] rounded-full bg-brand-100 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-20 lg:py-28">
            <div className="max-w-3xl space-y-6">
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="size-3" /> Com Bella IA no plano Premium
              </Badge>
              <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
                Seu salão organizado. Seus clientes mais próximos. Seu negócio
                crescendo.
              </h1>
              <p className="max-w-2xl text-lg text-[var(--muted-foreground)]">
                Agenda, clientes, financeiro, WhatsApp, estoque e inteligência
                artificial em uma única plataforma.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/cadastrar">
                    Começar grátis <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#planos">Ver planos</Link>
                </Button>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {TRIAL_DAYS} dias grátis · sem cartão de crédito · cancele quando
                quiser
              </p>
            </div>

            <p className="mt-16 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Exemplo de painel
            </p>
            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Atendimentos hoje', value: '18' },
                { label: 'Faturamento do mês', value: formatCurrency(41850) },
                { label: 'Clientes reativados', value: '87' },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-5">
                    <dt className="text-sm text-[var(--muted-foreground)]">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 font-display text-3xl">{stat.value}</dd>
                  </CardContent>
                </Card>
              ))}
            </dl>
          </div>
        </section>

        <section id="recursos" className="border-y border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="max-w-2xl space-y-3">
              <h2 className="font-display text-3xl">
                Tudo que o seu salão usa todo dia
              </h2>
              <p className="text-[var(--muted-foreground)]">
                Um sistema pensado para a rotina de cabeleireiras, manicures, nail
                designers, esteticistas e studios de beleza.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((benefit) => (
                <div key={benefit.title} className="space-y-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
                    <benefit.icon className="size-5" />
                  </span>
                  <h3 className="text-base font-semibold">{benefit.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <Badge variant="brand">Diferencial</Badge>
              <h2 className="font-display text-3xl">
                O que nenhuma agenda comum tem
              </h2>
              <p className="text-[var(--muted-foreground)]">
                A ficha técnica de cabelo e o histórico químico transformam o
                atendimento: qualquer profissional da equipe repete a fórmula
                exata da cliente, com produto, tonalidade, oxidante e tempo de
                pausa.
              </p>
              <ul className="space-y-2">
                {DIFFERENTIALS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Card className="overflow-hidden">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Coloração · Mariana Alves</p>
                  <Badge variant="outline">25/08</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Produto', 'Wella Koleston'],
                    ['Fórmula', '7.1 — 40 g · 8.0 — 20 g'],
                    ['Oxidante', '20 volumes · 60 ml'],
                    ['Pausa', '35 minutos'],
                    ['Profissional', 'Ana'],
                    ['Resultado', 'Cobertura total'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-[var(--muted)] p-3">
                      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-3 text-sm">
                  <Sparkles className="size-4 text-brand-600" />
                  Reutilizar esta fórmula no próximo atendimento
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-brand-800 text-white">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div className="space-y-5">
                <Badge className="bg-white/15 text-white">Bella IA</Badge>
                <h2 className="font-display text-3xl">
                  Pergunte. A Bella IA responde com os dados do seu salão.
                </h2>
                <p className="text-brand-100">
                  &ldquo;Quanto faturei este mês?&rdquo;, &ldquo;qual serviço tem
                  maior margem?&rdquo;, &ldquo;quantas clientes estão sem voltar há
                  90 dias?&rdquo; — e insights automáticos com sugestões de ação.
                </p>
              </div>
              <Card className="border-white/15 bg-white/10 text-white backdrop-blur">
                <CardContent className="space-y-3 p-6 text-sm">
                  <p className="font-medium">Insight BellaGestão</p>
                  <p className="text-brand-100">
                    Você tem 87 clientes sem retornar há mais de 90 dias. Elas já
                    geraram {formatCurrency(29450)}.
                  </p>
                  <p className="text-brand-100">
                    Sugestão: criar campanha de reativação pelo WhatsApp.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-3xl">Planos que crescem com você</h2>
            <p className="text-[var(--muted-foreground)]">
              Todos começam com {TRIAL_DAYS} dias grátis. Troque de plano quando
              quiser.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.code}
                className={
                  plan.code === 'profissional'
                    ? 'border-brand-400 shadow-md'
                    : undefined
                }
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl">{plan.name}</h3>
                    {plan.code === 'profissional' ? (
                      <Badge variant="brand">Mais escolhido</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {plan.description}
                  </p>
                  <p className="font-display text-4xl">
                    {formatCurrency(plan.priceMonthly)}
                    <span className="text-base text-[var(--muted-foreground)]">/mês</span>
                  </p>
                  <ul className="space-y-2 text-sm">
                    {plan.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="w-full"
                    variant={plan.code === 'profissional' ? 'default' : 'outline'}
                  >
                    <Link href={`/cadastrar?plano=${plan.code}`}>Começar grátis</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="font-display text-3xl">Quem já usa</h2>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {TESTIMONIALS.map((testimonial) => (
                <Card key={testimonial.author}>
                  <CardContent className="space-y-4 p-6">
                    <p className="text-sm leading-relaxed">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div>
                      <p className="text-sm font-medium">{testimonial.author}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {testimonial.role}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="duvidas" className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="font-display text-3xl">Perguntas frequentes</h2>
          <div className="mt-8 divide-y divide-[var(--border)]">
            {FAQ.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.question}
                    <ArrowRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <Card className="overflow-hidden border-brand-200 bg-brand-50">
            <CardContent className="flex flex-col items-center gap-5 p-12 text-center">
              <BarChart3 className="size-8 text-brand-600" />
              <h2 className="font-display text-3xl">
                Comece hoje a organizar o seu salão
              </h2>
              <p className="max-w-xl text-[var(--muted-foreground)]">
                Em poucos minutos você cadastra sua equipe, seus serviços e já
                começa a agendar.
              </p>
              <Button asChild size="lg">
                <Link href="/cadastrar">
                  Começar grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p>© {new Date().getFullYear()} BellaGestão. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
