'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RevenuePoint } from '../queries'
import { formatCurrency } from '@/lib/utils'

const AXIS_STYLE = { fontSize: 12, fill: 'var(--muted-foreground)' }

function compactCurrency(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`
  return String(value)
}

export function RevenueAreaChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">
        Ainda não há atendimentos finalizados neste período.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-400)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-brand-400)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={compactCurrency}
          width={48}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value ?? 0))}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            fontSize: 13,
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Faturamento"
          stroke="var(--color-brand-500)"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function RevenueBarChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">
        Sem dados no período selecionado.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={compactCurrency}
          width={48}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          formatter={(value) => formatCurrency(Number(value ?? 0))}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            fontSize: 13,
          }}
        />
        <Bar dataKey="revenue" name="Faturamento" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
