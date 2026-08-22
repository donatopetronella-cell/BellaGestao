# BellaGestão

Plataforma SaaS multiempresa de gestão para salões de beleza, cabeleireiros,
manicures, nail designers, designers de sobrancelha, maquiadores, esteticistas,
spas, studios e profissionais autônomos.

> **Estado atual: Fase 1 (Fundação) concluída.**
> Projeto, autenticação, isolamento multi-tenant com Row Level Security, RBAC,
> layout responsivo, onboarding, configurações e dashboard com dados reais.
> O modelo de dados completo (56 tabelas) já está migrado; os módulos das
> fases 2 a 6 estão mapeados em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Tecnologias

| Camada | Escolha |
| --- | --- |
| Front-end | Next.js 16 (App Router), React 19, TypeScript estrito |
| Interface | Tailwind CSS v4, componentes próprios no padrão shadcn/ui, Radix UI, Lucide |
| Gráficos | Recharts |
| Back-end | Server Actions + Route Handlers do Next.js |
| Banco | PostgreSQL 16 + Prisma 7 (driver adapter `pg`) |
| Autenticação | Sessões próprias no banco (bcrypt + tokens opacos) |
| Validação | Zod |
| Testes | Vitest (unitários e de integração contra o banco real) |

---

## Requisitos

* Node.js 20.11+ (recomendado 22)
* PostgreSQL 16+
* npm 10+

---

## Instalação

```bash
git clone <repo> && cd BellaGestao
npm install
cp .env.example .env
```

### Banco de dados

A aplicação usa **duas conexões, de propósito**:

* `DATABASE_URL` — papel da aplicação (`bella_app`), **sem `BYPASSRLS`** e que
  **não é dono das tabelas**. É por ele que o RLS protege os dados.
* `DIRECT_DATABASE_URL` — papel dono (`bella_owner`), usado por migrações,
  seed, login/recuperação de senha e webhooks de cobrança.

Criação dos papéis e do banco em desenvolvimento:

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE bella_owner LOGIN PASSWORD 'bella_owner_dev' CREATEDB;
CREATE ROLE bella_app   LOGIN PASSWORD 'bella_app_dev';
CREATE DATABASE bellagestao OWNER bella_owner;
SQL
```

> `CREATEDB` é necessário apenas em desenvolvimento, para o *shadow database*
> do `prisma migrate dev`. Em produção use `npm run db:deploy`.

Migrações, client e dados demonstrativos:

```bash
npm run db:migrate      # aplica as migrations (cria também as policies de RLS)
npm run db:generate     # gera o Prisma Client em src/generated/prisma
npm run db:seed         # dados de demonstração
npm run dev             # http://localhost:3000
```

---

## Variáveis de ambiente

Todas em `.env` (nunca no código). Veja `.env.example`.

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | conexão da aplicação (papel restrito, sujeito a RLS) |
| `DIRECT_DATABASE_URL` | sim | conexão do dono (migrations, seed, auth, webhooks) |
| `APP_URL` | sim | URL pública da aplicação |
| `AUTH_SECRET` | sim | segredo de sessão, mínimo 32 caracteres (`openssl rand -base64 48`) |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | fase 4 | fotos antes/depois no Storage |
| `OPENAI_API_KEY` | fase 5 | Bella IA |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | fase 4 | WhatsApp Cloud API |
| `MERCADO_PAGO_ACCESS_TOKEN` | fase 6 | assinaturas |

O arquivo `src/lib/env.ts` valida o ambiente com Zod e falha no boot com uma
mensagem clara se algo estiver faltando.

---

## Usuários de demonstração

`npm run db:seed` cria dois salões independentes — útil para conferir o
isolamento na prática. Senha de todos: **`bella@2026`**.

| E-mail | Perfil | Salão |
| --- | --- | --- |
| `proprietaria@bellagestao.dev` | Proprietário | Bella Hair Studio |
| `gerente@bellagestao.dev` | Gerente | Bella Hair Studio |
| `recepcao@bellagestao.dev` | Recepcionista | Bella Hair Studio |
| `financeiro@bellagestao.dev` | Financeiro | Bella Hair Studio |
| `ana@bellagestao.dev` | Profissional | Bella Hair Studio |
| `contato@studioglamour.dev` | Proprietário | Studio Glamour |

O Bella Hair Studio vem com 4 profissionais, 24 clientes, 10 serviços, produtos
com estoque, cerca de 400 atendimentos dos últimos 90 dias, vendas, comissões,
despesas, fichas capilares e histórico químico.

---

## Desenvolvimento

```bash
npm run dev          # servidor de desenvolvimento
npm run lint         # ESLint (flat config do Next)
npm run typecheck    # tsc --noEmit
npm test             # Vitest
npm run build        # build de produção
npm start            # servidor de produção
npm run db:studio    # Prisma Studio
npm run db:reset     # recria o banco e roda o seed
```

Ordem recomendada antes de commitar: `npm run typecheck && npm run lint && npm test`.

---

## Testes

O suite usa o **banco real** (as garantias de isolamento só valem se forem
verificadas no PostgreSQL). Defina `DATABASE_URL` e `DIRECT_DATABASE_URL` — em
desenvolvimento o próprio `.env` serve.

| Arquivo | Cobertura |
| --- | --- |
| `tests/tenant-isolation.test.ts` | **Tenant A não acessa nada do Tenant B**: leitura, busca por id, update, delete, insert forjado, agregação e SQL bruto; garante ainda que toda tabela com `tenant_id` tem RLS + policy e que a conexão da app não é superusuária |
| `tests/auth.test.ts` | cadastro, login, sessão (só o hash é gravado), recuperação e troca de senha, verificação de e-mail |
| `tests/rbac.test.ts` | matriz de permissões dos cinco perfis e exceções por membro |
| `tests/dashboard.test.ts` | indicadores calculados do banco, escopo do profissional e ausência de vazamento entre salões |
| `tests/utils.test.ts` | formatação, datas com fuso do salão, tradução de erros, rate limit |

---

## Segurança

* Isolamento em três camadas (sessão → aplicação → RLS no PostgreSQL).
* Papel de aplicação sem `BYPASSRLS`; papel dono restrito a auth, migrations,
  seed e webhooks.
* Senhas com bcrypt; tokens de sessão, recuperação e verificação guardados
  apenas como SHA-256.
* Rate limit em login, cadastro e recuperação de senha.
* Cabeçalhos `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e
  `Permissions-Policy`.
* Auditoria (`audit_logs`) com usuário, ação, entidade, IP e user-agent.
* Erros técnicos nunca chegam ao usuário: `src/lib/errors.ts` traduz falhas
  conhecidas ("Já existe um registro com estes dados.") e registra o resto.
* LGPD: consentimento por cliente, campo de anonimização e remoção completa de
  um salão via `hardDeleteTenant()`.

---

## Deploy

1. Provisione um PostgreSQL 16 e crie os dois papéis (dono e aplicação).
2. Configure as variáveis de ambiente na plataforma (Vercel, Railway, Fly.io,
   VPS…).
3. `npm ci && npm run db:deploy && npm run build`.
4. Suba com `npm start` (ou o runtime da plataforma).
5. Healthcheck: `GET /api/health`.

O `build` executa `prisma generate` automaticamente — o client fica em
`src/generated/prisma` e não é versionado.

---

## PWA

`manifest.webmanifest`, ícones 192/512/maskable e `theme-color` já estão
configurados; o app pode ser instalado na tela inicial do celular.

---

## Documentação

* [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — arquitetura geral, banco,
  multi-tenant, autenticação, autorização, páginas, componentes, APIs,
  migrations e roadmap das fases.
