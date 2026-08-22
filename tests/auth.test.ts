import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import {
  authenticate,
  changePassword,
  createSession,
  registerAccount,
  requestPasswordReset,
  resetPassword,
  revokeSession,
  verifyEmail,
} from '@/lib/auth/service'
import { hashToken } from '@/lib/auth/tokens'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { disconnectDb, getAdminDb, hardDeleteTenant, withTenant } from '@/lib/db'
import { registerSchema, passwordSchema } from '@/validators/auth'

const createdUserIds: string[] = []
const createdTenantIds: string[] = []

function uniqueEmail(): string {
  return `teste-${randomUUID().slice(0, 8)}@bellagestao.test`
}

async function register(email = uniqueEmail(), password = 'segura123') {
  const result = await registerAccount({
    salonName: 'Salão de Teste',
    name: 'Dona Teste',
    email,
    phone: undefined,
    password,
    planCode: 'profissional',
    acceptTerms: true,
  })
  createdUserIds.push(result.userId)
  createdTenantIds.push(result.tenantId)
  return { ...result, email, password }
}

afterAll(async () => {
  for (const tenantId of createdTenantIds) {
    await hardDeleteTenant(tenantId).catch(() => undefined)
  }
  await getAdminDb().user.deleteMany({ where: { id: { in: createdUserIds } } })
  await disconnectDb()
})

describe('senhas', () => {
  it('hash não é reversível e a verificação funciona', async () => {
    const hash = await hashPassword('segura123')
    expect(hash).not.toContain('segura123')
    expect(await verifyPassword('segura123', hash)).toBe(true)
    expect(await verifyPassword('errada123', hash)).toBe(false)
  })

  it('política de senha exige letra e número', () => {
    expect(passwordSchema.safeParse('curta1').success).toBe(false)
    expect(passwordSchema.safeParse('somenteletras').success).toBe(false)
    expect(passwordSchema.safeParse('12345678').success).toBe(false)
    expect(passwordSchema.safeParse('segura123').success).toBe(true)
  })

  it('cadastro exige aceite dos termos', () => {
    const parsed = registerSchema.safeParse({
      salonName: 'Salão',
      name: 'Dona',
      email: 'a@b.com',
      password: 'segura123',
      acceptTerms: false,
    })
    expect(parsed.success).toBe(false)
  })
})

describe('cadastro de conta', () => {
  it('cria usuário, salão, unidade, assinatura em teste e vínculo de proprietário', async () => {
    const { userId, tenantId, tenantSlug } = await register()
    const db = getAdminDb()

    const tenant = await db.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        status: true,
        trialEndsAt: true,
        slug: true,
        branches: { select: { isDefault: true } },
        settings: { select: { tenantId: true } },
        subscription: { select: { status: true } },
        memberships: { select: { userId: true, role: true } },
      },
    })

    expect(tenant.slug).toBe(tenantSlug)
    expect(tenant.status).toBe('TRIAL')
    expect(tenant.trialEndsAt).toBeInstanceOf(Date)
    expect(tenant.branches).toHaveLength(1)
    expect(tenant.settings).not.toBeNull()
    expect(tenant.subscription?.status).toBe('TRIAL')
    expect(tenant.memberships).toEqual([{ userId, role: 'OWNER' }])

    const categories = await withTenant(tenantId, (tx) =>
      tx.financialCategory.count({ where: { tenantId } }),
    )
    expect(categories).toBeGreaterThan(0)
  })

  it('gera slugs distintos para salões de mesmo nome', async () => {
    const first = await register()
    const second = await register()
    expect(first.tenantSlug).not.toBe(second.tenantSlug)
  })

  it('recusa e-mail já cadastrado', async () => {
    const { email } = await register()
    await expect(register(email)).rejects.toThrow(/já existe uma conta/i)
  })
})

describe('login e sessão', () => {
  it('autentica com a senha correta', async () => {
    const { userId, email, password } = await register()
    const result = await authenticate({ email, password })
    expect(result.userId).toBe(userId)
  })

  it('recusa senha incorreta e e-mail inexistente com a mesma mensagem', async () => {
    const { email } = await register()
    await expect(authenticate({ email, password: 'errada123' })).rejects.toThrow(
      /e-mail ou senha incorretos/i,
    )
    await expect(
      authenticate({ email: 'ninguem@bellagestao.test', password: 'errada123' }),
    ).rejects.toThrow(/e-mail ou senha incorretos/i)
  })

  it('armazena apenas o hash do token da sessão e permite revogar', async () => {
    const { userId } = await register()
    const session = await createSession(userId, { ip: '127.0.0.1' })
    const db = getAdminDb()

    const stored = await db.session.findUniqueOrThrow({
      where: { id: session.id },
      select: { tokenHash: true, revokedAt: true },
    })
    expect(stored.tokenHash).toBe(hashToken(session.token))
    expect(stored.tokenHash).not.toBe(session.token)

    await revokeSession(session.token)
    const revoked = await db.session.findUniqueOrThrow({
      where: { id: session.id },
      select: { revokedAt: true },
    })
    expect(revoked.revokedAt).toBeInstanceOf(Date)
  })
})

describe('recuperação e troca de senha', () => {
  it('redefine a senha e encerra as sessões abertas', async () => {
    const { userId, email } = await register()
    const session = await createSession(userId)
    const request = await requestPasswordReset(email)
    expect(request).not.toBeNull()

    await resetPassword(request!.token, 'novasenha123')

    const result = await authenticate({ email, password: 'novasenha123' })
    expect(result.userId).toBe(userId)

    const stored = await getAdminDb().session.findUniqueOrThrow({
      where: { id: session.id },
      select: { revokedAt: true },
    })
    expect(stored.revokedAt).toBeInstanceOf(Date)
  })

  it('token de recuperação não pode ser reutilizado', async () => {
    const { email } = await register()
    const request = await requestPasswordReset(email)
    await resetPassword(request!.token, 'novasenha123')
    await expect(resetPassword(request!.token, 'outrasenha123')).rejects.toThrow(
      /expirou/i,
    )
  })

  it('não revela se o e-mail existe', async () => {
    expect(await requestPasswordReset('desconhecido@bellagestao.test')).toBeNull()
  })

  it('troca de senha exige a senha atual', async () => {
    const { userId, password } = await register()
    await expect(
      changePassword(userId, 'errada123', 'novasenha123'),
    ).rejects.toThrow(/senha atual incorreta/i)
    await expect(
      changePassword(userId, password, 'novasenha123'),
    ).resolves.toBeUndefined()
  })
})

describe('verificação de e-mail', () => {
  it('marca o e-mail como verificado e invalida o token', async () => {
    const { userId, emailVerificationToken } = await register()
    await verifyEmail(emailVerificationToken)

    const user = await getAdminDb().user.findUniqueOrThrow({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    })
    expect(user.emailVerifiedAt).toBeInstanceOf(Date)

    await expect(verifyEmail(emailVerificationToken)).rejects.toThrow(/inválido|expirado/i)
  })
})
