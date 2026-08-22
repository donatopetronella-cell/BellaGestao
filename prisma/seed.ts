/**
 * Development seed.
 *
 * Creates two independent salons so tenant isolation can be exercised by hand
 * (and by the automated tests), plus a full demo dataset for the first one:
 * team, services, clients, hair records, products, appointments across the last
 * three months, sales, expenses and commissions.
 *
 * Runs through the owner connection (DIRECT_DATABASE_URL) because it writes
 * across tenants; the application itself never does that.
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import type { AppointmentStatus, MemberRole } from '../src/generated/prisma/enums.js'
import { PLANS } from '../src/config/plans.js'
import { ALL_PERMISSIONS, PERMISSIONS, ROLE_PERMISSIONS } from '../src/lib/rbac/permissions.js'
import { DELETION_ORDER } from '../src/lib/db/tenant-cleanup.js'

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? ''
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const DEMO_PASSWORD = 'bella@2026'

/** Deterministic pseudo-random so re-seeding produces comparable numbers. */
let seedState = 42
function random(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296
  return seedState / 4294967296
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T
}
function between(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min
}

function atTime(base: Date, hour: number, minute: number): Date {
  const date = new Date(base)
  date.setUTCHours(hour + 3, minute, 0, 0) // America/Sao_Paulo (UTC-3)
  return date
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setUTCHours(12, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - days)
  return date
}

async function syncCatalogues(): Promise<void> {
  for (const code of ALL_PERMISSIONS) {
    const definition = PERMISSIONS[code]
    await prisma.permission.upsert({
      where: { code },
      create: { code, module: definition.module, description: definition.description },
      update: { module: definition.module, description: definition.description },
    })
  }

  await prisma.rolePermission.deleteMany({})
  const rolePermissions = Object.entries(ROLE_PERMISSIONS).flatMap(
    ([role, permissions]) =>
      permissions.map((permission) => ({
        role: role as MemberRole,
        permissionCode: permission,
      })),
  )
  await prisma.rolePermission.createMany({ data: rolePermissions })

  for (const plan of PLANS) {
    await prisma.plan.upsert({
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
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        features: plan.features,
        limits: plan.limits,
        sortOrder: plan.sortOrder,
      },
    })
  }

  console.log(
    `✓ catálogos sincronizados (${ALL_PERMISSIONS.length} permissões, ${PLANS.length} planos)`,
  )
}

interface CreateTenantOptions {
  name: string
  slug: string
  planCode: string
  ownerEmail: string
  ownerName: string
}

async function createTenant(options: CreateTenantOptions) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: options.planCode } })
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  const tenant = await prisma.tenant.create({
    data: {
      name: options.name,
      slug: options.slug,
      email: options.ownerEmail,
      phone: '(11) 3000-1000',
      whatsapp: '(11) 99000-1000',
      status: 'TRIAL',
      trialEndsAt,
      onboardingStep: 7,
      onboardingCompletedAt: new Date(),
      settings: { create: { monthlyRevenueGoal: 50000, appointmentIntervalMin: 15 } },
      branches: {
        create: {
          name: 'Unidade Centro',
          slug: 'centro',
          isDefault: true,
          city: 'São Paulo',
          state: 'SP',
        },
      },
      subscription: {
        create: {
          planId: plan.id,
          status: 'TRIAL',
          provider: 'MANUAL',
          trialStartsAt: new Date(),
          trialEndsAt,
        },
      },
    },
    select: { id: true, branches: { select: { id: true } } },
  })

  const branchId = tenant.branches[0]!.id

  const owner = await prisma.user.create({
    data: {
      email: options.ownerEmail,
      name: options.ownerName,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    select: { id: true },
  })

  await prisma.membership.create({
    data: { tenantId: tenant.id, userId: owner.id, role: 'OWNER' },
  })

  const weekdays = [1, 2, 3, 4, 5, 6]
  await prisma.branchOpeningHour.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      tenantId: tenant.id,
      branchId,
      weekday,
      startMin: weekday === 6 ? 8 * 60 : 9 * 60,
      endMin: weekday === 6 ? 17 * 60 : 19 * 60,
      isClosed: weekday === 0,
    })),
  })

  return { tenantId: tenant.id, branchId, ownerId: owner.id, weekdays }
}

async function seedDemoTenant(): Promise<void> {
  const { tenantId, branchId, weekdays } = await createTenant({
    name: 'Bella Hair Studio',
    slug: 'bella-hair-studio',
    planCode: 'premium',
    ownerEmail: 'proprietaria@bellagestao.dev',
    ownerName: 'Marina Bella',
  })

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  // --- team ---------------------------------------------------------------
  const professionalSeeds = [
    { name: 'Ana Prado', specialty: 'Colorista', commission: 40 },
    { name: 'Juliana Moraes', specialty: 'Cabeleireira', commission: 35 },
    { name: 'Camila Nunes', specialty: 'Manicure e nail designer', commission: 50 },
    { name: 'Bruna Ferraz', specialty: 'Designer de sobrancelhas', commission: 45 },
  ]

  const professionals = []
  for (const seed of professionalSeeds) {
    const professional = await prisma.professional.create({
      data: {
        tenantId,
        name: seed.name,
        specialty: seed.specialty,
        phone: `(11) 9${between(1000, 9999)}-${between(1000, 9999)}`,
        email: `${seed.name.split(' ')[0]!.toLowerCase()}@bellahair.dev`,
        commissionPercent: seed.commission,
        workingHours: {
          create: weekdays.map((weekday) => ({
            tenantId,
            branchId,
            weekday,
            startMin: 9 * 60,
            endMin: 19 * 60,
            breakStartMin: 12 * 60,
            breakEndMin: 13 * 60,
          })),
        },
      },
      select: { id: true, name: true, commissionPercent: true },
    })
    professionals.push(professional)
  }

  // Staff users covering every role.
  const staff: Array<{ email: string; name: string; role: MemberRole; professionalIndex?: number }> = [
    { email: 'gerente@bellagestao.dev', name: 'Renata Lima', role: 'MANAGER' },
    { email: 'recepcao@bellagestao.dev', name: 'Paula Souza', role: 'RECEPTIONIST' },
    { email: 'financeiro@bellagestao.dev', name: 'Sandra Reis', role: 'FINANCE' },
    { email: 'ana@bellagestao.dev', name: 'Ana Prado', role: 'PROFESSIONAL', professionalIndex: 0 },
  ]

  for (const member of staff) {
    const user = await prisma.user.create({
      data: {
        email: member.email,
        name: member.name,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
      select: { id: true },
    })
    await prisma.membership.create({
      data: {
        tenantId,
        userId: user.id,
        role: member.role,
        professionalId:
          member.professionalIndex !== undefined
            ? professionals[member.professionalIndex]!.id
            : null,
      },
    })
  }

  // --- catalogue ----------------------------------------------------------
  const categories = new Map<string, string>()
  for (const name of ['Cabelo', 'Coloração', 'Unhas', 'Sobrancelhas', 'Estética']) {
    const category = await prisma.serviceCategory.create({
      data: { tenantId, name },
      select: { id: true },
    })
    categories.set(name, category.id)
  }

  const serviceSeeds = [
    { name: 'Corte feminino', category: 'Cabelo', duration: 60, price: 120, cost: 12 },
    { name: 'Escova', category: 'Cabelo', duration: 45, price: 80, cost: 8 },
    { name: 'Hidratação', category: 'Cabelo', duration: 60, price: 140, cost: 25 },
    { name: 'Progressiva', category: 'Cabelo', duration: 180, price: 450, cost: 90 },
    { name: 'Coloração', category: 'Coloração', duration: 120, price: 260, cost: 55 },
    { name: 'Mechas', category: 'Coloração', duration: 210, price: 520, cost: 120 },
    { name: 'Manicure', category: 'Unhas', duration: 45, price: 55, cost: 6 },
    { name: 'Pedicure', category: 'Unhas', duration: 60, price: 65, cost: 7 },
    { name: 'Design de sobrancelha', category: 'Sobrancelhas', duration: 30, price: 60, cost: 4 },
    { name: 'Maquiagem', category: 'Estética', duration: 60, price: 180, cost: 20 },
  ]

  const services = []
  for (const seed of serviceSeeds) {
    const service = await prisma.service.create({
      data: {
        tenantId,
        categoryId: categories.get(seed.category)!,
        name: seed.name,
        durationMinutes: seed.duration,
        price: seed.price,
        cost: seed.cost,
        commissionKind: 'PERCENT',
        commissionValue: 40,
      },
      select: { id: true, name: true, price: true, durationMinutes: true },
    })
    services.push(service)
  }

  // Which professional performs which service.
  const serviceAssignments: Record<string, number[]> = {
    'Corte feminino': [0, 1],
    Escova: [0, 1],
    Hidratação: [0, 1],
    Progressiva: [1],
    Coloração: [0],
    Mechas: [0],
    Manicure: [2],
    Pedicure: [2],
    'Design de sobrancelha': [3],
    Maquiagem: [3],
  }

  for (const service of services) {
    for (const index of serviceAssignments[service.name] ?? [0]) {
      await prisma.serviceProfessional.create({
        data: {
          tenantId,
          serviceId: service.id,
          professionalId: professionals[index]!.id,
        },
      })
    }
  }

  // --- products & inventory ----------------------------------------------
  const supplier = await prisma.supplier.create({
    data: { tenantId, name: 'Distribuidora Beleza Pro', phone: '(11) 4002-8922' },
    select: { id: true },
  })

  const productCategory = await prisma.productCategory.create({
    data: { tenantId, name: 'Coloração' },
    select: { id: true },
  })

  const productSeeds = [
    { name: 'Wella Koleston 7.1', brand: 'Wella', cost: 22, price: 45, unit: 'un', min: 5, qty: 2 },
    { name: 'Wella Koleston 8.0', brand: 'Wella', cost: 22, price: 45, unit: 'un', min: 5, qty: 9 },
    { name: 'Oxidante 20 volumes 900ml', brand: 'Wella', cost: 28, price: 55, unit: 'un', min: 4, qty: 6 },
    { name: 'Pó descolorante 500g', brand: 'Blondor', cost: 89, price: 150, unit: 'un', min: 3, qty: 4 },
    { name: 'Shampoo pós-química 300ml', brand: 'Kérastase', cost: 65, price: 129, unit: 'un', min: 6, qty: 12 },
  ]

  for (const seed of productSeeds) {
    const product = await prisma.product.create({
      data: {
        tenantId,
        categoryId: productCategory.id,
        supplierId: supplier.id,
        name: seed.name,
        brand: seed.brand,
        cost: seed.cost,
        price: seed.price,
        unit: seed.unit,
        minStock: seed.min,
        isSupply: true,
      },
      select: { id: true },
    })

    await prisma.inventoryItem.create({
      data: { tenantId, branchId, productId: product.id, quantity: seed.qty },
    })
    await prisma.inventoryMovement.create({
      data: {
        tenantId,
        branchId,
        productId: product.id,
        type: 'PURCHASE',
        quantity: seed.qty,
        unitCost: seed.cost,
        reason: 'Carga inicial de estoque',
      },
    })
  }

  // --- clients ------------------------------------------------------------
  const firstNames = [
    'Mariana', 'Beatriz', 'Larissa', 'Fernanda', 'Patrícia', 'Aline', 'Carolina',
    'Débora', 'Gabriela', 'Helena', 'Isabela', 'Joana', 'Karina', 'Letícia',
    'Manuela', 'Natália', 'Olívia', 'Priscila', 'Rafaela', 'Simone', 'Tatiana',
    'Vanessa', 'Yasmin', 'Amanda',
  ]
  const lastNames = ['Alves', 'Barros', 'Cardoso', 'Dias', 'Esteves', 'Farias', 'Gomes', 'Henrique']
  const origins = ['Indicação', 'Instagram', 'Google', 'Passou em frente', 'WhatsApp']

  const clients = []
  for (let index = 0; index < firstNames.length; index += 1) {
    const name = `${firstNames[index]} ${pick(lastNames)}`
    const lastVisitDays = between(3, 160)
    const firstVisitDays = between(180, 400)
    const client = await prisma.client.create({
      data: {
        tenantId,
        branchId,
        name,
        phone: `(11) 9${between(1000, 9999)}-${between(1000, 9999)}`,
        whatsapp: `(11) 9${between(1000, 9999)}-${between(1000, 9999)}`,
        email: `${firstNames[index]!.toLowerCase()}@cliente.dev`,
        birthDate: new Date(Date.UTC(1985 + between(0, 15), between(0, 11), between(1, 28))),
        source: pick(origins),
        marketingConsent: true,
        consentAt: new Date(),
        preferredProfessionalId: pick(professionals).id,
        // Registration date mirrors the first visit so the "new vs. returning"
        // indicators reflect a salon with history.
        createdAt: daysAgo(index < 4 ? between(1, 20) : firstVisitDays),
        firstVisitAt: daysAgo(firstVisitDays),
        lastVisitAt: daysAgo(lastVisitDays),
        loyaltyAccount: { create: { tenantId, pointsBalance: between(0, 900), visits: between(1, 20) } },
      },
      select: { id: true, name: true },
    })
    clients.push(client)
  }

  // Hair records for the first six clients.
  for (const client of clients.slice(0, 6)) {
    await prisma.clientHairProfile.create({
      data: {
        tenantId,
        clientId: client.id,
        hairType: pick(['Liso', 'Ondulado', 'Cacheado']),
        length: pick(['Curto', 'Médio', 'Longo']),
        curvature: pick(['1A', '2B', '3A']),
        texture: pick(['Fina', 'Média', 'Grossa']),
        condition: pick(['Saudável', 'Ressecado', 'Quimicamente tratado']),
        previousProcedures: 'Coloração e hidratação',
      },
    })

    await prisma.chemicalRecord.create({
      data: {
        tenantId,
        clientId: client.id,
        professionalId: professionals[0]!.id,
        procedure: 'COLORING',
        brand: 'Wella',
        productName: 'Koleston',
        formula: [
          { tone: '7.1', grams: 40 },
          { tone: '8.0', grams: 20 },
        ],
        oxidantVolume: 20,
        oxidantMl: 60,
        pauseMinutes: 35,
        result: 'Cobertura total dos fios brancos',
        performedAt: daysAgo(between(20, 90)),
      },
    })
  }

  // --- appointments, sales, expenses --------------------------------------
  const statuses: AppointmentStatus[] = ['FINISHED', 'FINISHED', 'FINISHED', 'CANCELED', 'NO_SHOW']
  let saleNumber = 1

  for (let dayOffset = 89; dayOffset >= 0; dayOffset -= 1) {
    const day = daysAgo(dayOffset)
    if (day.getUTCDay() === 0) continue

    const appointmentsToday = between(3, 7)
    for (let index = 0; index < appointmentsToday; index += 1) {
      const professionalIndex = between(0, professionals.length - 1)
      const professional = professionals[professionalIndex]!
      const eligible = services.filter((service) =>
        (serviceAssignments[service.name] ?? []).includes(professionalIndex),
      )
      const service = eligible.length > 0 ? pick(eligible) : pick(services)
      const client = pick(clients)
      const startHour = between(9, 17)
      const startsAt = atTime(day, startHour, pick([0, 30]))
      const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000)
      const status: AppointmentStatus =
        dayOffset === 0 ? pick(['CONFIRMED', 'PENDING', 'ARRIVED', 'FINISHED']) : pick(statuses)
      const price = Number(service.price)
      const billable = status === 'FINISHED'

      const appointment = await prisma.appointment.create({
        data: {
          tenantId,
          branchId,
          clientId: client.id,
          professionalId: professional.id,
          startsAt,
          endsAt,
          status,
          source: pick(['INTERNAL', 'INTERNAL', 'ONLINE', 'WHATSAPP']),
          total: status === 'CANCELED' || status === 'NO_SHOW' ? 0 : price,
          confirmedAt: status === 'PENDING' ? null : startsAt,
          finishedAt: billable ? endsAt : null,
          canceledAt: status === 'CANCELED' ? startsAt : null,
          services: {
            create: {
              tenantId,
              serviceId: service.id,
              professionalId: professional.id,
              price,
              durationMinutes: service.durationMinutes,
              commissionAmount:
                (price * Number(professional.commissionPercent)) / 100,
            },
          },
        },
        select: { id: true },
      })

      if (!billable) continue

      const sale = await prisma.sale.create({
        data: {
          tenantId,
          branchId,
          clientId: client.id,
          professionalId: professional.id,
          appointmentId: appointment.id,
          number: saleNumber++,
          subtotal: price,
          total: price,
          status: 'PAID',
          soldAt: endsAt,
          items: {
            create: {
              tenantId,
              kind: 'SERVICE',
              serviceId: service.id,
              professionalId: professional.id,
              description: service.name,
              quantity: 1,
              unitPrice: price,
              total: price,
              commissionAmount:
                (price * Number(professional.commissionPercent)) / 100,
            },
          },
          payments: {
            create: {
              tenantId,
              method: pick(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH']),
              amount: price,
              paidAt: endsAt,
            },
          },
        },
        select: { id: true },
      })

      const referenceMonth = new Date(
        Date.UTC(endsAt.getUTCFullYear(), endsAt.getUTCMonth(), 1),
      )
      await prisma.commission.create({
        data: {
          tenantId,
          professionalId: professional.id,
          appointmentId: appointment.id,
          baseAmount: price,
          kind: 'PERCENT',
          rateValue: professional.commissionPercent,
          amount: (price * Number(professional.commissionPercent)) / 100,
          status: dayOffset > 30 ? 'PAID' : 'PENDING',
          referenceMonth,
        },
      })

      await prisma.revenue.create({
        data: {
          tenantId,
          branchId,
          description: `Atendimento · ${service.name}`,
          amount: price,
          status: 'SETTLED',
          receivedAt: endsAt,
          referenceType: 'sale',
          referenceId: sale.id,
        },
      })
    }
  }

  const expenseCategories = await prisma.financialCategory.createManyAndReturn({
    data: [
      { tenantId, name: 'Aluguel', kind: 'EXPENSE' as const },
      { tenantId, name: 'Água e energia', kind: 'EXPENSE' as const },
      { tenantId, name: 'Produtos e insumos', kind: 'EXPENSE' as const },
      { tenantId, name: 'Salários', kind: 'EXPENSE' as const },
      { tenantId, name: 'Marketing', kind: 'EXPENSE' as const },
      { tenantId, name: 'Serviços', kind: 'REVENUE' as const },
    ],
    select: { id: true, name: true, kind: true },
  })

  const expenseSeeds = [
    { name: 'Aluguel', amount: 4200 },
    { name: 'Água e energia', amount: 860 },
    { name: 'Produtos e insumos', amount: 2350 },
    { name: 'Salários', amount: 9800 },
    { name: 'Marketing', amount: 700 },
  ]

  for (let monthOffset = 2; monthOffset >= 0; monthOffset -= 1) {
    for (const expense of expenseSeeds) {
      const dueDate = new Date()
      dueDate.setUTCHours(12, 0, 0, 0)
      dueDate.setUTCMonth(dueDate.getUTCMonth() - monthOffset, 5)
      await prisma.expense.create({
        data: {
          tenantId,
          branchId,
          categoryId: expenseCategories.find((item) => item.name === expense.name)?.id,
          description: expense.name,
          amount: expense.amount,
          status: monthOffset === 0 ? 'PENDING' : 'SETTLED',
          dueDate,
          paidAt: monthOffset === 0 ? null : dueDate,
          isRecurring: true,
        },
      })
    }
  }

  await prisma.loyaltyProgram.create({
    data: {
      tenantId,
      mode: 'POINTS',
      pointsPerCurrency: 1,
      currencyPerPoint: 0.06,
      minRedeemPoints: 500,
      rewardDescription: '500 pontos = R$ 30 de desconto',
      isActive: true,
    },
  })

  await prisma.whatsappTemplate.createMany({
    data: [
      {
        tenantId,
        code: 'confirmacao_agendamento',
        name: 'Confirmação de agendamento',
        body:
          'Olá, {{cliente}} 🌸\nSeu horário foi reservado.\n📅 {{data}}\n⏰ {{hora}}\n💇 {{servico}}\n👩‍🎨 {{profissional}}\nConfirme seu horário.',
        variables: ['cliente', 'data', 'hora', 'servico', 'profissional'],
      },
      {
        tenantId,
        code: 'lembrete_24h',
        name: 'Lembrete 24 horas',
        body: 'Oi, {{cliente}}! Passando para lembrar do seu horário amanhã às {{hora}}. Até lá! 💕',
        variables: ['cliente', 'hora'],
      },
      {
        tenantId,
        code: 'aniversario',
        name: 'Aniversário',
        body: 'Feliz aniversário, {{cliente}}! 🎉 O {{salao}} preparou um presente especial para você.',
        variables: ['cliente', 'salao'],
      },
    ],
  })

  await prisma.notification.createMany({
    data: [
      {
        tenantId,
        type: 'LOW_STOCK',
        title: 'Produto abaixo do estoque mínimo',
        body: 'Wella Koleston 7.1 · estoque 2 · mínimo 5',
      },
      {
        tenantId,
        type: 'INACTIVE_CLIENT',
        title: 'Clientes inativas identificadas',
        body: 'Há clientes sem retornar há mais de 90 dias. Considere uma campanha de reativação.',
      },
    ],
  })

  const counts = await prisma.appointment.count({ where: { tenantId } })
  console.log(
    `✓ Bella Hair Studio: ${professionals.length} profissionais, ${clients.length} clientes, ${services.length} serviços, ${counts} agendamentos`,
  )
}

async function seedSecondTenant(): Promise<void> {
  const { tenantId, branchId } = await createTenant({
    name: 'Studio Glamour',
    slug: 'studio-glamour',
    planCode: 'profissional',
    ownerEmail: 'contato@studioglamour.dev',
    ownerName: 'Cláudia Glamour',
  })

  const professional = await prisma.professional.create({
    data: { tenantId, name: 'Renata Duarte', specialty: 'Cabeleireira', commissionPercent: 40 },
    select: { id: true },
  })

  const service = await prisma.service.create({
    data: {
      tenantId,
      name: 'Corte e escova',
      durationMinutes: 90,
      price: 160,
      commissionValue: 40,
    },
    select: { id: true, durationMinutes: true },
  })

  const client = await prisma.client.create({
    data: { tenantId, branchId, name: 'Sofia Menezes', phone: '(21) 98888-1234' },
    select: { id: true },
  })

  const startsAt = atTime(daysAgo(1), 10, 0)
  await prisma.appointment.create({
    data: {
      tenantId,
      branchId,
      clientId: client.id,
      professionalId: professional.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + service.durationMinutes * 60_000),
      status: 'FINISHED',
      total: 160,
      finishedAt: new Date(startsAt.getTime() + 90 * 60_000),
      services: {
        create: {
          tenantId,
          serviceId: service.id,
          professionalId: professional.id,
          price: 160,
          durationMinutes: service.durationMinutes,
        },
      },
    },
  })

  console.log('✓ Studio Glamour criado (segundo tenant, para validar o isolamento)')
}

async function reset(): Promise<void> {
  const slugs = ['bella-hair-studio', 'studio-glamour']
  const tenants = await prisma.tenant.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, memberships: { select: { userId: true } } },
  })
  const userIds = tenants.flatMap((tenant) =>
    tenant.memberships.map((membership) => membership.userId),
  )

  // Ordered delete: FKs to professionals/services restrict on purpose.
  for (const tenant of tenants) {
    for (const table of DELETION_ORDER) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE tenant_id = $1::uuid`,
        tenant.id,
      )
    }
    await prisma.$executeRawUnsafe(
      `DELETE FROM "tenants" WHERE id = $1::uuid`,
      tenant.id,
    )
  }
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }
}

async function main(): Promise<void> {
  console.log('▸ Semeando o banco de desenvolvimento…')
  await syncCatalogues()
  await reset()
  await seedDemoTenant()
  await seedSecondTenant()
  console.log(`\n✓ Concluído. Acesse com qualquer usuário abaixo (senha: ${DEMO_PASSWORD}):`)
  console.log('  proprietaria@bellagestao.dev  · Proprietário')
  console.log('  gerente@bellagestao.dev       · Gerente')
  console.log('  recepcao@bellagestao.dev      · Recepcionista')
  console.log('  financeiro@bellagestao.dev    · Financeiro')
  console.log('  ana@bellagestao.dev           · Profissional')
  console.log('  contato@studioglamour.dev     · Proprietário do segundo salão')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
