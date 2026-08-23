import type { AppointmentStatus } from '@/generated/prisma/enums'

/**
 * Status flow of an appointment. Kept in one place so the agenda, the finish
 * flow and the tests all agree on what is allowed.
 */
export const APPOINTMENT_STATUS_FLOW: Record<
  AppointmentStatus,
  readonly AppointmentStatus[]
> = {
  PENDING: ['CONFIRMED', 'ARRIVED', 'IN_SERVICE', 'CANCELED', 'NO_SHOW'],
  CONFIRMED: ['ARRIVED', 'IN_SERVICE', 'PENDING', 'CANCELED', 'NO_SHOW'],
  ARRIVED: ['IN_SERVICE', 'FINISHED', 'CANCELED', 'NO_SHOW'],
  IN_SERVICE: ['FINISHED', 'ARRIVED', 'CANCELED'],
  FINISHED: [],
  CANCELED: [],
  NO_SHOW: [],
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Aguardando confirmação',
  CONFIRMED: 'Confirmado',
  ARRIVED: 'Cliente chegou',
  IN_SERVICE: 'Em atendimento',
  FINISHED: 'Finalizado',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
}

export const OPEN_STATUSES: readonly AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'ARRIVED',
  'IN_SERVICE',
]

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return APPOINTMENT_STATUS_FLOW[from].includes(to)
}

/** `FINISHED` has its own flow (it settles money), never a plain status change. */
export function isTerminal(status: AppointmentStatus): boolean {
  return APPOINTMENT_STATUS_FLOW[status].length === 0
}
