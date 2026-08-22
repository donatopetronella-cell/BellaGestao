import 'server-only'
import { withTenant } from '@/lib/db'
import type { SalonSetupInput } from '@/validators/tenant'

export interface SalonSetupView {
  name: string
  legalName: string
  document: string
  phone: string
  whatsapp: string
  email: string
  timezone: string
  currency: string
  appointmentIntervalMin: number
  cancellationPolicyHours: number
  cancellationPolicyText: string
  monthlyRevenueGoal: number | null
  reminder24hEnabled: boolean
  reminder2hEnabled: boolean
}

export async function getSalonSetup(tenantId: string): Promise<SalonSetupView> {
  return withTenant(tenantId, async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        name: true,
        legalName: true,
        document: true,
        phone: true,
        whatsapp: true,
        email: true,
        timezone: true,
        currency: true,
        settings: {
          select: {
            appointmentIntervalMin: true,
            cancellationPolicyHours: true,
            cancellationPolicyText: true,
            monthlyRevenueGoal: true,
            reminder24hEnabled: true,
            reminder2hEnabled: true,
          },
        },
      },
    })

    return {
      name: tenant.name,
      legalName: tenant.legalName ?? '',
      document: tenant.document ?? '',
      phone: tenant.phone ?? '',
      whatsapp: tenant.whatsapp ?? '',
      email: tenant.email ?? '',
      timezone: tenant.timezone,
      currency: tenant.currency,
      appointmentIntervalMin: tenant.settings?.appointmentIntervalMin ?? 15,
      cancellationPolicyHours: tenant.settings?.cancellationPolicyHours ?? 24,
      cancellationPolicyText: tenant.settings?.cancellationPolicyText ?? '',
      monthlyRevenueGoal: tenant.settings?.monthlyRevenueGoal
        ? Number(tenant.settings.monthlyRevenueGoal)
        : null,
      reminder24hEnabled: tenant.settings?.reminder24hEnabled ?? true,
      reminder2hEnabled: tenant.settings?.reminder2hEnabled ?? true,
    }
  })
}

export async function saveSalonSetup(
  tenantId: string,
  input: SalonSetupInput,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        name: input.name,
        legalName: input.legalName || null,
        document: input.document || null,
        phone: input.phone ?? null,
        whatsapp: input.whatsapp ?? null,
        email: input.email || null,
        timezone: input.timezone,
        currency: input.currency,
      },
    })

    await tx.tenantSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        appointmentIntervalMin: input.appointmentIntervalMin,
        cancellationPolicyHours: input.cancellationPolicyHours,
        cancellationPolicyText: input.cancellationPolicyText || null,
        monthlyRevenueGoal: input.monthlyRevenueGoal ?? null,
        reminder24hEnabled: input.reminder24hEnabled,
        reminder2hEnabled: input.reminder2hEnabled,
      },
      update: {
        appointmentIntervalMin: input.appointmentIntervalMin,
        cancellationPolicyHours: input.cancellationPolicyHours,
        cancellationPolicyText: input.cancellationPolicyText || null,
        monthlyRevenueGoal: input.monthlyRevenueGoal ?? null,
        reminder24hEnabled: input.reminder24hEnabled,
        reminder2hEnabled: input.reminder2hEnabled,
      },
    })
  })
}

export interface OnboardingProgress {
  step: number
  completedAt: Date | null
  hasProfessionals: boolean
  hasServices: boolean
  hasClients: boolean
  hasOpeningHours: boolean
}

export async function getOnboardingProgress(
  tenantId: string,
): Promise<OnboardingProgress> {
  return withTenant(tenantId, async (tx) => {
    // Sequential: all of these run on the single connection pinned to the
    // transaction that carries the RLS context.
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { onboardingStep: true, onboardingCompletedAt: true },
    })
    const professionals = await tx.professional.count({ where: { tenantId } })
    const services = await tx.service.count({ where: { tenantId } })
    const clients = await tx.client.count({ where: { tenantId } })
    const openingHours = await tx.branchOpeningHour.count({ where: { tenantId } })

    return {
      step: tenant.onboardingStep,
      completedAt: tenant.onboardingCompletedAt,
      hasProfessionals: professionals > 0,
      hasServices: services > 0,
      hasClients: clients > 0,
      hasOpeningHours: openingHours > 0,
    }
  })
}

export async function setOnboardingStep(
  tenantId: string,
  step: number,
): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: step },
    }),
  )
}

export async function completeOnboarding(tenantId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.tenant.update({
      where: { id: tenantId },
      data: { onboardingCompletedAt: new Date(), onboardingStep: 7 },
    }),
  )
}

export interface OpeningHourInput {
  weekday: number
  isClosed: boolean
  startMin: number
  endMin: number
}

export async function saveOpeningHours(
  tenantId: string,
  hours: OpeningHourInput[],
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const branch = await tx.branch.findFirst({
      where: { tenantId, isDefault: true },
      select: { id: true },
    })
    if (!branch) return

    for (const hour of hours) {
      await tx.branchOpeningHour.upsert({
        where: {
          branchId_weekday: { branchId: branch.id, weekday: hour.weekday },
        },
        create: {
          tenantId,
          branchId: branch.id,
          weekday: hour.weekday,
          startMin: hour.startMin,
          endMin: hour.endMin,
          isClosed: hour.isClosed,
        },
        update: {
          startMin: hour.startMin,
          endMin: hour.endMin,
          isClosed: hour.isClosed,
        },
      })
    }
  })
}

export async function getOpeningHours(
  tenantId: string,
): Promise<OpeningHourInput[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.branchOpeningHour.findMany({
      where: { tenantId },
      orderBy: { weekday: 'asc' },
      select: { weekday: true, startMin: true, endMin: true, isClosed: true },
    }),
  )
  return rows
}
