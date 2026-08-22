# BellaGestão — Arquitetura

> Documento de referência da **ETAPA 1**. Descreve as decisões que sustentam
> todas as fases seguintes. O que já está implementado está marcado com ✅; o
> que está projetado (banco pronto, telas nas próximas fases) com 🚧.

---

## 1. Arquitetura geral

```
                    ┌──────────────────────────────────────────┐
   Navegador /      │  Next.js (App Router, React 19, TS)      │
   PWA             ─┤   • Server Components (leitura)          │
                    │   • Server Actions (escrita)             │
                    │   • Middleware (guarda de sessão)        │
                    └───────────────┬──────────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────────┐
                    │  Camada de domínio (src/features, src/lib)│
                    │   • validação Zod                        │
                    │   • RBAC + regras de negócio             │
                    │   • auditoria                            │
                    └───────────────┬──────────────────────────┘
                                    │  withTenant(tenantId, fn)
                    ┌───────────────▼──────────────────────────┐
                    │  Prisma 7 + driver adapter (pg)           │
                    │   appDb  → papel SEM bypass de RLS        │
                    │   adminDb→ papel dono (auth/billing/seed) │
                    └───────────────┬──────────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────────┐
                    │  PostgreSQL 16                            │
                    │   • Row Level Security por tenant_id      │
                    │   • índices por (tenant_id, data)         │
                    └──────────────────────────────────────────┘
```

Integrações externas previstas (fases 4–6) entram como *adapters* isolados em
`src/lib`, sem vazar para o domínio: WhatsApp Cloud API, OpenAI, Mercado Pago
(e, depois, Stripe), Supabase Storage para fotos.

**Por que Server Actions e não uma API REST completa?** Toda escrita passa por
uma função de servidor tipada, com validação Zod e verificação de permissão no
mesmo lugar. Rotas HTTP (`src/app/api`) ficam reservadas para o que precisa de
um endpoint público: webhooks de pagamento, webhook do WhatsApp, healthcheck e
futuras integrações.

---

## 2. Arquitetura do banco

56 tabelas, todas migradas. Agrupadas por domínio:

| Domínio | Tabelas |
| --- | --- |
| Identidade | `users`, `sessions`, `password_reset_tokens`, `email_verification_tokens` |
| Tenancy | `tenants`, `tenant_settings`, `branches`, `branch_opening_hours`, `memberships`, `invitations` |
| Autorização | `permissions`, `role_permissions`, `member_permission_overrides` |
| CRM | `clients`, `client_hair_profiles`, `chemical_history`, `hair_formulas`, `client_photos`, `consent_records` |
| Equipe | `professionals`, `professional_working_hours`, `professional_time_off` |
| Catálogo | `service_categories`, `services`, `service_professionals`, `service_supplies` |
| Agenda | `appointments`, `appointment_services` |
| Estoque | `suppliers`, `product_categories`, `products`, `inventory`, `inventory_movements` |
| Vendas | `sales`, `sale_items`, `sale_payments` |
| Caixa | `cash_registers`, `cash_movements` |
| Financeiro | `financial_categories`, `revenues`, `expenses` |
| Comissões | `commission_rules`, `commissions` |
| SaaS | `plans`, `subscriptions`, `payments`, `webhook_events` |
| Relacionamento | `whatsapp_templates`, `whatsapp_messages`, `campaigns`, `campaign_targets` |
| Fidelidade | `loyalty_programs`, `loyalty_accounts`, `loyalty_transactions` |
| Plataforma | `notifications`, `audit_logs` |

Convenções:

* **Chaves** `uuid v7` (`@db.Uuid`) — ordenáveis por tempo, boas para índice.
* **Dinheiro** `numeric(12,2)`; quantidades de insumo `numeric(12,3)`.
* **`tenant_id` obrigatório** em toda tabela de dados do salão.
* **Índices compostos** sempre começando por `tenant_id`
  (`(tenant_id, starts_at)`, `(tenant_id, professional_id, starts_at)`,
  `(tenant_id, last_visit_at)`, `(tenant_id, birth_date)`…).
* **Exclusão lógica** (`deleted_at`) em clientes, profissionais, serviços,
  produtos e unidades — histórico financeiro nunca é destruído.
* **Horários** guardados em minutos desde a meia-noite (`start_min`/`end_min`),
  imunes a fuso e horário de verão; instantes em `timestamptz`.

Remoção definitiva de um salão (LGPD / cancelamento) usa
`hardDeleteTenant()`, que apaga na ordem de dependência — as FKs para
`professionals` e `services` são restritivas de propósito, para que ninguém
apague um profissional com histórico por acidente.

---

## 3. Estrutura de pastas

```
prisma/
  schema.prisma          modelo completo
  migrations/            init + row_level_security
  seed.ts                dados demonstrativos (2 salões)
src/
  app/
    (marketing)/         landing page pública
    (auth)/              entrar, cadastrar, senha, verificação
    (app)/               área autenticada (layout com sidebar)
    api/                 healthcheck (webhooks nas fases 4 e 6)
  components/
    ui/                  primitivos (Button, Card, Input, Table…)
    layout/              AppShell, Sidebar, Header, TenantSwitcher
  features/              domínio por módulo
    dashboard/  billing/  settings/   (+ agenda, clients… nas fases seguintes)
  lib/
    auth/                sessão, senha, tokens, contexto, RBAC guards
    db/                  clientes Prisma + withTenant/withUser
    rbac/                catálogo de permissões e matriz de perfis
    audit.ts  dates.ts  errors.ts  rate-limit.ts  env.ts  utils.ts
  server/actions/        Server Actions (escrita)
  validators/            schemas Zod
  config/                planos, navegação
tests/                   isolamento, auth, RBAC, dashboard, utilitários
docs/                    este documento
```

Regra: **`features/<módulo>`** contém `queries.ts` (leitura), `service.ts`
(regra de negócio) e `components/`. A lógica de negócio nunca mora no
componente.

---

## 4. Modelo multi-tenant

Hierarquia: `tenant` (salão) → `branches` (unidades, plano Premium) →
dados operacionais. Um usuário pode pertencer a vários salões (`memberships`),
e o salão ativo vem do cookie `bella_tenant`, validado contra os vínculos reais
a cada requisição.

**Três camadas de isolamento:**

1. **Sessão** — o contexto resolve o salão ativo apenas entre os `memberships`
   ativos do usuário.
2. **Aplicação** — toda leitura/escrita passa por
   `withTenant(tenantId, fn)`; nenhuma consulta usa o client Prisma cru.
3. **Banco (RLS)** — cada transação executa
   `set_config('app.current_tenant_id', …, true)` e as policies filtram por
   `tenant_id`. Um `where` esquecido devolve **zero linhas**, não os dados de
   outro salão.

O runtime conecta com um papel **sem `BYPASSRLS` e que não é dono das tabelas**
(`bella_app`). O papel dono (`bella_owner`) é usado apenas por migrações, seed,
login/recuperação de senha e webhooks de cobrança — operações que, por
definição, não têm um tenant no contexto.

Policies especiais:

* `tenants` — visível pelo tenant ativo **ou** pelos salões do usuário logado
  (necessário para o seletor de salão).
* `memberships` — pelo tenant ativo **ou** pelo próprio `user_id`.
* `users` — o próprio usuário **ou** quem compartilha o tenant ativo.
* `plans`, `permissions`, `role_permissions` — leitura pública, escrita só pelo
  dono.

Teste obrigatório do produto (`tests/tenant-isolation.test.ts`): **o Tenant A
não acessa nenhum registro do Tenant B** — leitura, `findUnique` por id,
`update`, `delete`, `insert` carimbado com outro `tenant_id`, agregações e SQL
bruto. Um teste adicional garante que **toda** tabela com `tenant_id` tem RLS
habilitado e policy — nenhuma tabela nova escapa por esquecimento.

---

## 5. Estratégia de autenticação

Sessões opacas no banco (não JWT), porque revogação imediata importa mais que
statelessness em um sistema com recepcionista, caixa e vários dispositivos.

* Senha: **bcrypt (custo 12)**; política mínima de 8 caracteres com letra e
  número.
* Sessão: token aleatório de 48 bytes no cookie `bella_session`
  (`httpOnly`, `sameSite=lax`, `secure` em produção, 30 dias). **Só o SHA-256
  do token é armazenado.**
* Recuperação de senha e verificação de e-mail: tokens de uso único com prazo
  (1h / 48h), também guardados apenas como hash; redefinir a senha revoga todas
  as sessões abertas.
* Login com resposta idêntica para e-mail inexistente e senha errada, com
  comparação de hash sempre executada (evita descobrir e-mails por tempo de
  resposta).
* Rate limit em login, cadastro e recuperação (em memória hoje; Redis quando
  houver mais de uma instância).
* `middleware.ts` barra o acesso à área logada sem cookie; a validação real
  (sessão viva, vínculo, permissão) acontece sempre no servidor.

> **Supabase Auth** era a alternativa sugerida no briefing. Optamos por
> autenticação própria sobre o mesmo PostgreSQL para manter todo o modelo —
> inclusive `memberships` e RLS — em um único banco, sem depender de um serviço
> externo em desenvolvimento e em testes. A troca é possível: `src/lib/auth`
> é a única fronteira que conhece credenciais.

---

## 6. Estratégia de autorização

RBAC com cinco perfis e catálogo de **50 permissões** (`src/lib/rbac`):

| Perfil | Alcance |
| --- | --- |
| Proprietário | tudo |
| Gerente | tudo, exceto alterar assinatura e ver auditoria |
| Recepcionista | agenda, clientes, caixa, vendas, WhatsApp |
| Profissional | própria agenda, própria comissão, ficha capilar |
| Financeiro | caixa, financeiro, comissões, relatórios |

* O código é a fonte da verdade; o seed espelha o catálogo em
  `permissions`/`role_permissions` para uma futura tela de perfis
  personalizados.
* `member_permission_overrides` permite exceção por pessoa (liberar ou tirar
  uma permissão específica).
* Guardas: `requireAuth()`, `requireTenant()`, `requirePermission()`,
  `requireAnyPermission()` para páginas; `assertPermission()` para rotas de API.
* **Escopo próprio**: o Profissional recebe `agenda.view_own` em vez de
  `agenda.view`; as consultas passam a filtrar pelo `professional_id` dele —
  inclusive nos gráficos do painel.
* O menu lateral é montado a partir das permissões **e** dos recursos do plano
  contratado.

---

## 7. Páginas

| Rota | Estado |
| --- | --- |
| `/` landing page | ✅ |
| `/entrar`, `/cadastrar`, `/esqueci-senha`, `/redefinir-senha`, `/verificar-email` | ✅ |
| `/onboarding` | ✅ (passos 1 e 2 funcionais, demais linkados) |
| `/painel` dashboard | ✅ |
| `/configuracoes`, `/configuracoes/assinatura`, `/conta`, `/notificacoes`, `/sem-permissao` | ✅ |
| `/agenda`, `/clientes`, `/profissionais`, `/servicos` | 🚧 fase 2 |
| `/produtos`, `/estoque`, `/vendas`, `/caixa`, `/financeiro`, `/comissoes`, `/relatorios` | 🚧 fase 3 |
| `/marketing`, `/whatsapp`, `/fidelidade` | 🚧 fase 4 |
| `/bella-ia` | 🚧 fase 5 |
| `/{slug}` agenda online pública | 🚧 fase 4 |
| `/admin/*` painel do SaaS | 🚧 fase 6 |

As rotas 🚧 já existem, já exigem a permissão correta e mostram o que está
pronto no banco e o que vem a seguir — em vez de uma tela falsa.

---

## 8. Componentes principais

* **`AppShell`** — sidebar fixa no desktop, gaveta no mobile, header fixo.
* **`SidebarNav`** — navegação filtrada por permissão e plano (os ícones são
  resolvidos no cliente; o servidor envia apenas nomes serializáveis).
* **`TenantSwitcher`** — troca de salão (multiunidade / multi-salão).
* **`UserMenu`**, **`GlobalSearch`**, **`PageHeader`**.
* **UI**: `Button`, `Card`, `Input`, `Textarea`, `Label`, `Badge`, `Table`,
  `Dialog`, `DropdownMenu`, `Alert`, `Progress`, `Avatar`, `EmptyState`,
  `FormField`, `SubmitButton`, `Separator`.
* **Dashboard**: `StatCard`, `RangeFilter`, `RevenueAreaChart`,
  `RevenueBarChart`, `AppointmentStatusBadge`.
* **Configurações**: `SalonForm`, `OpeningHoursForm`.

---

## 9. APIs e Server Actions

Implementado ✅

| Ação | Arquivo |
| --- | --- |
| `registerAction`, `loginAction`, `logoutAction`, `switchTenantAction`, `forgotPasswordAction`, `resetPasswordAction`, `verifyEmailAction` | `src/server/actions/auth.ts` |
| `saveSalonAction`, `saveOpeningHoursAction`, `finishOnboardingAction`, `changePasswordAction` | `src/server/actions/settings.ts` |
| `GET /api/health` | `src/app/api/health/route.ts` |

Previsto 🚧

| Fase | Interface |
| --- | --- |
| 2 | ações de agenda (criar/reagendar/cancelar/finalizar), clientes, profissionais, serviços; `GET /api/search` |
| 3 | caixa, vendas, estoque, financeiro, comissões, exportações (PDF/Excel/CSV) |
| 4 | `POST /api/webhooks/whatsapp`, envio de templates, agenda online pública |
| 5 | `POST /api/ai/ask` (consulta restrita ao tenant), insights |
| 6 | `POST /api/webhooks/mercadopago`, checkout, troca de plano, painel do SaaS |

---

## 10. Migrations iniciais

1. `20260822183934_init` — as 56 tabelas, enums, índices e chaves.
2. `20260822184500_row_level_security` — funções
   `app_current_tenant_id()`/`app_current_user_id()`, papel de aplicação,
   `ENABLE ROW LEVEL SECURITY` + policies em todas as tabelas.

Migrações rodam pela conexão do dono (`DIRECT_DATABASE_URL`); a aplicação usa
`DATABASE_URL` (papel restrito).

---

## Roadmap

| Fase | Escopo | Estado |
| --- | --- | --- |
| 1 | Projeto, autenticação, multi-tenant, RBAC, layout, dashboard | ✅ |
| 2 | Agenda, clientes (ficha capilar/histórico químico), profissionais, serviços | 🚧 |
| 3 | Financeiro, caixa, comissões, estoque, produtos, vendas, relatórios | 🚧 |
| 4 | WhatsApp, agenda online, CRM/campanhas, fidelidade | 🚧 |
| 5 | Bella IA, insights, automações | 🚧 |
| 6 | Assinaturas (Mercado Pago), planos, painel administrativo do SaaS | 🚧 |
