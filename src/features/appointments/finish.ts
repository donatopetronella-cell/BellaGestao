import 'server-only'
import { withTenant } from '@/lib/db'
import { conflict, notFound, validationError } from '@/lib/errors'
import type { FinishAppointmentInput } from '@/validators/appointment'

export interface FinishAppointmentResult {
  saleId: string
  saleNumber: number
  total: number
  commissionTotal: number
  loyaltyPointsEarned: number
  cashRegisterOpen: boolean
}

/**
 * Closing an appointment is the moment money moves. In a single transaction it:
 * creates the sale and its payments, books the commission of each service,
 * registers the revenue, feeds the open cash register, updates the client's
 * visit history and credits loyalty points.
 */
export async function finishAppointment(
  tenantId: string,
  input: FinishAppointmentInput,
  meta: { userId?: string | null },
): Promise<FinishAppointmentResult> {
  return withTenant(
    tenantId,
    async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: { id: input.appointmentId, tenantId },
        select: {
          id: true,
          branchId: true,
          clientId: true,
          professionalId: true,
          status: true,
          startsAt: true,
          endsAt: true,
          services: {
            select: {
              serviceId: true,
              professionalId: true,
              price: true,
              commissionAmount: true,
              service: { select: { name: true, commissionKind: true } },
            },
          },
        },
      })
      if (!appointment) throw notFound('Atendimento não encontrado.')
      if (appointment.status === 'FINISHED') {
        throw conflict('Este atendimento já foi finalizado.')
      }
      if (appointment.status === 'CANCELED' || appointment.status === 'NO_SHOW') {
        throw conflict('Um atendimento cancelado não pode ser finalizado.')
      }
      if (appointment.services.length === 0) {
        throw validationError('O atendimento não tem serviços lançados.')
      }

      const subtotal = appointment.services.reduce(
        (sum, item) => sum + Number(item.price),
        0,
      )
      const discount = Math.min(input.discount, subtotal)
      const total = Math.round((subtotal - discount) * 100) / 100

      const paid =
        Math.round(
          input.payments.reduce((sum, payment) => sum + payment.amount, 0) * 100,
        ) / 100
      if (Math.abs(paid - total) > 0.01) {
        throw validationError(
          `A soma dos pagamentos (${paid.toFixed(2)}) não confere com o total (${total.toFixed(2)}).`,
        )
      }

      const lastSale = await tx.sale.findFirst({
        where: { tenantId },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
      const saleNumber = (lastSale?.number ?? 0) + 1

      const openRegister = await tx.cashRegister.findFirst({
        where: { tenantId, status: 'OPEN' },
        select: { id: true },
      })

      const now = new Date()

      const sale = await tx.sale.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          clientId: appointment.clientId,
          professionalId: appointment.professionalId,
          appointmentId: appointment.id,
          cashRegisterId: openRegister?.id ?? null,
          number: saleNumber,
          subtotal,
          discount,
          total,
          status: 'PAID',
          soldById: meta.userId ?? null,
          soldAt: now,
          items: {
            create: appointment.services.map((item) => ({
              tenantId,
              kind: 'SERVICE' as const,
              serviceId: item.serviceId,
              professionalId: item.professionalId,
              description: item.service.name,
              quantity: 1,
              unitPrice: item.price,
              total: item.price,
              commissionAmount: item.commissionAmount,
            })),
          },
          payments: {
            create: input.payments.map((payment) => ({
              tenantId,
              method: payment.method,
              amount: payment.amount,
              installments: payment.installments,
              cashRegisterId: openRegister?.id ?? null,
              paidAt: now,
            })),
          },
        },
        select: { id: true, number: true },
      })

      // Commission per service, in the month the service was delivered.
      const referenceMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      )
      let commissionTotal = 0
      for (const item of appointment.services) {
        const amount = Number(item.commissionAmount)
        if (amount <= 0) continue
        commissionTotal += amount
        await tx.commission.create({
          data: {
            tenantId,
            professionalId: item.professionalId,
            appointmentId: appointment.id,
            baseAmount: item.price,
            kind: item.service.commissionKind,
            rateValue: amount,
            amount,
            status: 'PENDING',
            referenceMonth,
          },
        })
      }

      await tx.revenue.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          description: `Atendimento #${saleNumber}`,
          amount: total,
          method: input.payments[0]?.method ?? null,
          status: 'SETTLED',
          receivedAt: now,
          referenceType: 'sale',
          referenceId: sale.id,
        },
      })

      if (openRegister) {
        for (const payment of input.payments) {
          await tx.cashMovement.create({
            data: {
              tenantId,
              cashRegisterId: openRegister.id,
              type: 'SALE',
              method: payment.method,
              amount: payment.amount,
              description: `Atendimento #${saleNumber}`,
              referenceType: 'sale',
              referenceId: sale.id,
              createdById: meta.userId ?? null,
            },
          })
        }
      }

      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'FINISHED',
          finishedAt: now,
          discount,
          total,
        },
      })

      const client = await tx.client.findUnique({
        where: { id: appointment.clientId },
        select: { firstVisitAt: true },
      })
      await tx.client.update({
        where: { id: appointment.clientId },
        data: {
          lastVisitAt: appointment.startsAt,
          firstVisitAt: client?.firstVisitAt ?? appointment.startsAt,
        },
      })

      // Loyalty: points are credited only when the program is switched on.
      let loyaltyPointsEarned = 0
      const program = await tx.loyaltyProgram.findUnique({
        where: { tenantId },
        select: { isActive: true, mode: true, pointsPerCurrency: true },
      })

      if (program?.isActive && program.mode === 'POINTS') {
        loyaltyPointsEarned = Math.floor(total * Number(program.pointsPerCurrency))
        if (loyaltyPointsEarned > 0) {
          const account = await tx.loyaltyAccount.upsert({
            where: { clientId: appointment.clientId },
            create: {
              tenantId,
              clientId: appointment.clientId,
              pointsBalance: loyaltyPointsEarned,
              visits: 1,
            },
            update: {
              pointsBalance: { increment: loyaltyPointsEarned },
              visits: { increment: 1 },
            },
            select: { id: true },
          })

          await tx.loyaltyTransaction.create({
            data: {
              tenantId,
              accountId: account.id,
              type: 'EARN',
              points: loyaltyPointsEarned,
              amount: total,
              description: `Atendimento #${saleNumber}`,
              referenceType: 'sale',
              referenceId: sale.id,
            },
          })
        }
      }

      return {
        saleId: sale.id,
        saleNumber: sale.number,
        total,
        commissionTotal: Math.round(commissionTotal * 100) / 100,
        loyaltyPointsEarned,
        cashRegisterOpen: openRegister !== null,
      }
    },
    meta.userId ?? null,
  )
}
