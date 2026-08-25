import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAdminDb } from '@/lib/db'
import { PlanEditForm } from '@/features/billing/components/plan-edit-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Editar plano · Admin' }

export default async function AdminPlanEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const plan = await getAdminDb().plan.findUnique({ where: { id } })
  if (!plan) notFound()

  const features = Array.isArray(plan.features) ? (plan.features as string[]) : []
  const limits = (plan.limits ?? {}) as Record<string, number>

  return (
    <>
      <PageHeader title={`Editar plano — ${plan.name}`} description={plan.code} />

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <PlanEditForm
            plan={{
              id: plan.id,
              name: plan.name,
              description: plan.description ?? '',
              priceMonthly: Number(plan.priceMonthly),
              priceYearly: plan.priceYearly ? Number(plan.priceYearly) : null,
              trialDays: plan.trialDays,
              sortOrder: plan.sortOrder,
              isActive: plan.isActive,
              features,
              limitBranches: limits.branches ?? 1,
              limitProfessionals: limits.professionals ?? 1,
              limitUsers: limits.users ?? 1,
              limitWhatsappMessagesPerMonth: limits.whatsappMessagesPerMonth ?? 0,
              limitAiQuestionsPerMonth: limits.aiQuestionsPerMonth ?? 0,
            }}
          />
        </CardContent>
      </Card>
    </>
  )
}
