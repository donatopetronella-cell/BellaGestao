import 'server-only'
import type { Prisma, PrismaClient } from '@/generated/prisma/client'
import { getAdminDb } from '@/lib/db'
import { conflict, unauthenticated, validationError } from '@/lib/errors'
import { PLANS, TRIAL_DAYS } from '@/config/plans'
import { slugify } from '@/lib/utils'
import { hashPassword, verifyPassword } from './password'
import { TOKEN_TTL, expiresIn, generateToken, hashToken } from './tokens'
import type { LoginInput, RegisterInput } from '@/validators/auth'

type Tx = Prisma.TransactionClient | PrismaClient

const DEFAULT_REVENUE_CATEGORIES = ['Serviços', 'Produtos', 'Outras receitas']
const DEFAULT_EXPENSE_CATEGORIES = [
  'Aluguel',
  'Água e energia',
  'Produtos e insumos',
  'Salários',
  'Marketing',
  'Impostos',
  'Fornecedores',
  'Outras despesas',
]

export interface RegisterResult {
  userId: string
  tenantId: string
  tenantSlug: string
  emailVerificationToken: string
}

async function uniqueSlug(tx: Tx, base: string): Promise<string> {
  const root = slugify(base) || 'salao'
  let candidate = root
  let suffix = 1
  while (await tx.tenant.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1
    candidate = `${root}-${suffix}`
  }
  return candidate
}

/**
 * Creates the user, the tenant and everything a brand new salon needs to log
 * in and start the onboarding: default branch, settings, owner membership,
 * trial subscription and the default financial categories.
 */
export async function registerAccount(
  input: RegisterInput,
): Promise<RegisterResult> {
  const db = getAdminDb()
  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })
  if (existing) {
    throw conflict('Já existe uma conta com este e-mail. Tente entrar.')
  }

  const passwordHash = await hashPassword(input.password)
  const verificationToken = generateToken()
  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  const result = await db.$transaction(async (tx) => {
    const plan =
      (await tx.plan.findUnique({ where: { code: input.planCode } })) ??
      (await tx.plan.findFirst({ orderBy: { sortOrder: 'asc' } }))
    if (!plan) {
      throw new Error('No plan configured. Run the database seed first.')
    }

    const slug = await uniqueSlug(tx, input.salonName)

    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone ?? null,
        passwordHash,
      },
      select: { id: true },
    })

    const tenant = await tx.tenant.create({
      data: {
        name: input.salonName,
        slug,
        email: input.email,
        phone: input.phone ?? null,
        whatsapp: input.phone ?? null,
        status: 'TRIAL',
        trialEndsAt,
        settings: { create: {} },
        branches: {
          create: {
            name: 'Unidade principal',
            slug: 'principal',
            isDefault: true,
            phone: input.phone ?? null,
          },
        },
        subscription: {
          create: {
            planId: plan.id,
            status: 'TRIAL',
            provider: 'MANUAL',
            trialStartsAt: now,
            trialEndsAt,
          },
        },
      },
      select: { id: true, slug: true },
    })

    await tx.membership.create({
      data: { tenantId: tenant.id, userId: user.id, role: 'OWNER' },
    })

    await tx.financialCategory.createMany({
      data: [
        ...DEFAULT_REVENUE_CATEGORIES.map((name) => ({
          tenantId: tenant.id,
          name,
          kind: 'REVENUE' as const,
        })),
        ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
          tenantId: tenant.id,
          name,
          kind: 'EXPENSE' as const,
        })),
      ],
    })

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(verificationToken),
        expiresAt: expiresIn(TOKEN_TTL.emailVerification),
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        userName: input.name,
        action: 'tenant.created',
        entity: 'tenant',
        entityId: tenant.id,
        summary: `Conta criada para ${input.salonName}`,
      },
    })

    return { userId: user.id, tenantId: tenant.id, tenantSlug: tenant.slug }
  })

  return { ...result, emailVerificationToken: verificationToken }
}

export interface CreatedSession {
  id: string
  token: string
  expiresAt: Date
  userId: string
}

export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<CreatedSession> {
  const token = generateToken(48)
  const expiresAt = expiresIn(TOKEN_TTL.session)
  const session = await getAdminDb().session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
    select: { id: true },
  })
  return { id: session.id, token, expiresAt, userId }
}

export async function authenticate(input: LoginInput): Promise<{ userId: string }> {
  const db = getAdminDb()
  const user = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true, passwordHash: true, deletedAt: true },
  })

  // Constant-ish work whether or not the account exists, to avoid leaking
  // which e-mails are registered through response timing.
  const hash =
    user?.passwordHash ??
    '$2b$12$0000000000000000000000000000000000000000000000000000'
  const valid = await verifyPassword(input.password, hash)

  if (!user || !valid || user.deletedAt) {
    throw unauthenticated('E-mail ou senha incorretos.')
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  return { userId: user.id }
}

export async function revokeSession(token: string): Promise<void> {
  await getAdminDb().session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await getAdminDb().session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/** Always resolves — never reveals whether the e-mail exists. */
export async function requestPasswordReset(
  email: string,
): Promise<{ token: string; userId: string } | null> {
  const db = getAdminDb()
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true },
  })
  if (!user || user.deletedAt) return null

  const token = generateToken()
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: expiresIn(TOKEN_TTL.passwordReset),
    },
  })
  return { token, userId: user.id }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const db = getAdminDb()
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  })

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw validationError('Este link de recuperação expirou. Solicite outro.')
  }

  const passwordHash = await hashPassword(newPassword)
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const db = getAdminDb()
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw validationError('Senha atual incorreta.')
  }
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  })
}

export async function verifyEmail(token: string): Promise<void> {
  const db = getAdminDb()
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  })

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw validationError('Link de verificação inválido ou expirado.')
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    db.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ])
}

/** Seed/administration helper: keeps the `plans` table in sync with the catalogue. */
export async function syncPlans(): Promise<void> {
  const db = getAdminDb()
  for (const plan of PLANS) {
    await db.plan.upsert({
      where: { code: plan.code },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        trialDays: plan.trialDays,
        features: plan.features,
        limits: plan.limits,
        sortOrder: plan.sortOrder,
      },
      update: {
        name: plan.name,
        description: plan.description,
        features: plan.features,
        limits: plan.limits,
        sortOrder: plan.sortOrder,
      },
    })
  }
}
