import type { AppointmentStatus } from '@/generated/prisma/enums'
import { Badge } from '@/components/ui/badge'

const STATUS: Record<
  AppointmentStatus,
  { label: string; variant: 'default' | 'outline' | 'success' | 'warning' | 'danger' }
> = {
  PENDING: { label: 'Aguardando confirmação', variant: 'warning' },
  CONFIRMED: { label: 'Confirmado', variant: 'default' },
  ARRIVED: { label: 'Cliente chegou', variant: 'outline' },
  IN_SERVICE: { label: 'Em atendimento', variant: 'outline' },
  FINISHED: { label: 'Finalizado', variant: 'success' },
  CANCELED: { label: 'Cancelado', variant: 'danger' },
  NO_SHOW: { label: 'Não compareceu', variant: 'danger' },
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = STATUS[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export const APPOINTMENT_STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS).map(([key, value]) => [key, value.label]),
) as Record<AppointmentStatus, string>
