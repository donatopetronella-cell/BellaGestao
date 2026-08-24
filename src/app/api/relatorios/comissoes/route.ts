import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'
import { listCommissions } from '@/features/commissions/service'
import { csvResponse, toCsv } from '@/lib/csv'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const context = await getAuthContext()
  if (!context?.tenant) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }
  if (!context.permissions.has('reports.export')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const month = new URL(request.url).searchParams.get('mes') ?? new Date().toISOString().slice(0, 7)
  const items = await listCommissions(context.tenant.id, { month })
  const csv = toCsv(items, [
    { key: 'professionalName', label: 'Profissional' },
    { key: 'source', label: 'Origem', format: (value) => (value === 'appointment' ? 'Atendimento' : 'Venda') },
    { key: 'baseAmount', label: 'Base', format: (value) => (value as number).toFixed(2) },
    { key: 'amount', label: 'Valor', format: (value) => (value as number).toFixed(2) },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Data', format: (value) => formatDate(value as Date) },
  ])

  return csvResponse(`comissoes-${month}.csv`, csv)
}
