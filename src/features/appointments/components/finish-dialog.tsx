'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { finishAppointmentAction } from '@/server/actions/appointments'
import { PAYMENT_METHOD_LABELS } from '@/validators/cash'
import type { AgendaAppointment } from '../service'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

interface PaymentRow {
  key: string
  method: string
  amount: string
  installments: string
}

export function FinishDialog({
  appointment,
  open,
  onOpenChange,
  cashRegisterOpen,
  trigger,
}: {
  appointment: AgendaAppointment
  open?: boolean
  onOpenChange?: (open: boolean) => void
  cashRegisterOpen: boolean
  trigger?: React.ReactNode
}) {
  const subtotal = appointment.services.reduce(
    (sum, service) => sum + service.price,
    0,
  )
  const [discount, setDiscount] = useState('0')
  const [rows, setRows] = useState<PaymentRow[]>([
    {
      key: 'first',
      method: 'PIX',
      amount: subtotal.toFixed(2),
      installments: '1',
    },
  ])

  const total = Math.max(0, subtotal - (Number(discount) || 0))
  const paid = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const remaining = Math.round((total - paid) * 100) / 100

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title="Finalizar atendimento"
      description={`${appointment.clientName} · ${appointment.services
        .map((service) => service.name)
        .join(', ')}`}
      action={finishAppointmentAction}
      submitLabel="Finalizar e receber"
      className="max-w-lg"
    >
      {(state) => (
        <>
          <input type="hidden" name="appointmentId" value={appointment.id} />

          {!cashRegisterOpen ? (
            <Alert variant="info">
              Nenhum caixa aberto. O pagamento será registrado na venda, mas não
              entrará no caixa do dia.
            </Alert>
          ) : null}

          <div className="rounded-lg border border-[var(--border)] p-3 text-sm">
            <p className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </p>
            <p className="mt-1 flex justify-between font-medium">
              <span>Total a receber</span>
              <span>{formatCurrency(total)}</span>
            </p>
          </div>

          <FormField label="Desconto (R$)" name="discount">
            <Input
              id="discount"
              name="discount"
              type="number"
              min={0}
              max={subtotal}
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </FormField>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Formas de pagamento</legend>
            {state.fieldErrors?.payments ? (
              <p className="text-xs text-danger">{state.fieldErrors.payments[0]}</p>
            ) : null}

            {rows.map((row, index) => (
              <div key={row.key} className="flex items-end gap-2">
                <div className="flex-1">
                  <label
                    className="text-xs text-[var(--muted-foreground)]"
                    htmlFor={`method-${index}`}
                  >
                    Forma
                  </label>
                  <Select
                    id={`method-${index}`}
                    name="paymentMethod"
                    value={row.method}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.key === row.key
                            ? { ...item, method: event.target.value }
                            : item,
                        ),
                      )
                    }
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS)
                      .filter(([value]) => value !== 'LOYALTY')
                      .map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                  </Select>
                </div>

                <div className="w-28">
                  <label
                    className="text-xs text-[var(--muted-foreground)]"
                    htmlFor={`amount-${index}`}
                  >
                    Valor
                  </label>
                  <Input
                    id={`amount-${index}`}
                    name="paymentAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.amount}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.key === row.key
                            ? { ...item, amount: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>

                <div className="w-20">
                  <label
                    className="text-xs text-[var(--muted-foreground)]"
                    htmlFor={`installments-${index}`}
                  >
                    Parcelas
                  </label>
                  <Input
                    id={`installments-${index}`}
                    name="paymentInstallments"
                    type="number"
                    min={1}
                    max={24}
                    value={row.installments}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.key === row.key
                            ? { ...item, installments: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover forma de pagamento"
                  onClick={() =>
                    setRows((current) =>
                      current.length === 1
                        ? current
                        : current.filter((item) => item.key !== row.key),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRows((current) => [
                    ...current,
                    {
                      key: crypto.randomUUID(),
                      method: 'CASH',
                      amount: Math.max(0, remaining).toFixed(2),
                      installments: '1',
                    },
                  ])
                }
              >
                <Plus className="size-4" /> Dividir pagamento
              </Button>

              <p
                className={
                  Math.abs(remaining) < 0.01
                    ? 'text-xs text-success'
                    : 'text-xs text-warning'
                }
              >
                {Math.abs(remaining) < 0.01
                  ? 'Pagamento fecha com o total.'
                  : remaining > 0
                    ? `Faltam ${formatCurrency(remaining)}`
                    : `Excedente de ${formatCurrency(Math.abs(remaining))}`}
              </p>
            </div>
          </fieldset>
        </>
      )}
    </FormDialog>
  )
}
