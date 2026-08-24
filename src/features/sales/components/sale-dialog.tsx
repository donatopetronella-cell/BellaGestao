'use client'

import { useState } from 'react'
import { Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { createSaleAction } from '@/server/actions/sales'
import { PAYMENT_METHOD_LABELS } from '@/validators/cash'
import { ClientPicker, type PickedClient } from '@/features/appointments/components/client-picker'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

interface ItemOption {
  id: string
  name: string
  price: number
}

interface ItemRow {
  key: string
  kind: 'PRODUCT' | 'SERVICE'
  itemId: string
  professionalId: string
  quantity: string
}

interface PaymentRow {
  key: string
  method: string
  amount: string
  installments: string
}

export function SaleDialog({
  products,
  services,
  professionals,
}: {
  products: ItemOption[]
  services: ItemOption[]
  professionals: Array<{ id: string; name: string }>
}) {
  const [client, setClient] = useState<PickedClient | null>(null)
  const [discount, setDiscount] = useState('0')
  const [items, setItems] = useState<ItemRow[]>([
    { key: 'first', kind: 'PRODUCT', itemId: '', professionalId: '', quantity: '1' },
  ])
  const [payments, setPayments] = useState<PaymentRow[]>([
    { key: 'first', method: 'PIX', amount: '0', installments: '1' },
  ])

  const optionsFor = (kind: 'PRODUCT' | 'SERVICE'): ItemOption[] =>
    kind === 'PRODUCT' ? products : services

  const subtotal = items.reduce((sum, row) => {
    const option = optionsFor(row.kind).find((candidate) => candidate.id === row.itemId)
    const quantity = Number(row.quantity) || 0
    return sum + (option ? option.price * quantity : 0)
  }, 0)
  const total = Math.max(0, Math.round((subtotal - (Number(discount) || 0)) * 100) / 100)
  const paid = payments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const remaining = Math.round((total - paid) * 100) / 100

  return (
    <FormDialog
      trigger={
        <Button>
          <ShoppingBag className="size-4" /> Nova venda
        </Button>
      }
      title="Nova venda"
      description="Produtos e serviços avulsos, com baixa automática de estoque e comissão."
      action={createSaleAction}
      submitLabel="Registrar venda"
      className="max-w-2xl"
      onSuccess={() => {
        setClient(null)
        setDiscount('0')
        setItems([{ key: 'first', kind: 'PRODUCT', itemId: '', professionalId: '', quantity: '1' }])
        setPayments([{ key: 'first', method: 'PIX', amount: '0', installments: '1' }])
      }}
    >
      {(state) => (
        <>
          <ClientPicker value={client} onChange={setClient} />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Itens</legend>
            {state.fieldErrors?.items ? (
              <p className="text-xs text-danger">{state.fieldErrors.items[0]}</p>
            ) : null}

            {items.map((row) => (
              <div key={row.key} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-2">
                  <label className="text-xs text-[var(--muted-foreground)]">Tipo</label>
                  <Select
                    name="itemKind"
                    value={row.kind}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((item) =>
                          item.key === row.key
                            ? {
                                ...item,
                                kind: event.target.value as 'PRODUCT' | 'SERVICE',
                                itemId: '',
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="PRODUCT">Produto</option>
                    <option value="SERVICE">Serviço</option>
                  </Select>
                </div>

                <div className="col-span-4">
                  <label className="text-xs text-[var(--muted-foreground)]">Item</label>
                  <Select
                    name="itemId"
                    value={row.itemId}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((item) =>
                          item.key === row.key ? { ...item, itemId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {optionsFor(row.kind).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} — {formatCurrency(option.price)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-3">
                  <label className="text-xs text-[var(--muted-foreground)]">Profissional</label>
                  <Select
                    name="itemProfessionalId"
                    value={row.professionalId}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((item) =>
                          item.key === row.key
                            ? { ...item, professionalId: event.target.value }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="">Sem comissão</option>
                    {professionals.map((professional) => (
                      <option key={professional.id} value={professional.id}>
                        {professional.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-[var(--muted-foreground)]">Qtd.</label>
                  <Input
                    name="itemQuantity"
                    type="number"
                    min={0.001}
                    step="0.001"
                    value={row.quantity}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((item) =>
                          item.key === row.key ? { ...item, quantity: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-1"
                  aria-label="Remover item"
                  onClick={() =>
                    setItems((current) =>
                      current.length === 1 ? current : current.filter((item) => item.key !== row.key),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems((current) => [
                  ...current,
                  {
                    key: crypto.randomUUID(),
                    kind: 'PRODUCT',
                    itemId: '',
                    professionalId: '',
                    quantity: '1',
                  },
                ])
              }
            >
              <Plus className="size-4" /> Adicionar item
            </Button>
          </fieldset>

          <div className="rounded-lg border border-[var(--border)] p-3 text-sm">
            <p className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </p>
            <p className="mt-1 flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </p>
          </div>

          <FormField label="Desconto (R$)" name="discount">
            <Input
              type="number"
              name="discount"
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

            {payments.map((row) => (
              <div key={row.key} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-[var(--muted-foreground)]">Forma</label>
                  <Select
                    name="paymentMethod"
                    value={row.method}
                    onChange={(event) =>
                      setPayments((current) =>
                        current.map((item) =>
                          item.key === row.key ? { ...item, method: event.target.value } : item,
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
                  <label className="text-xs text-[var(--muted-foreground)]">Valor</label>
                  <Input
                    name="paymentAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.amount}
                    onChange={(event) =>
                      setPayments((current) =>
                        current.map((item) =>
                          item.key === row.key ? { ...item, amount: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="w-20">
                  <label className="text-xs text-[var(--muted-foreground)]">Parcelas</label>
                  <Input
                    name="paymentInstallments"
                    type="number"
                    min={1}
                    max={24}
                    value={row.installments}
                    onChange={(event) =>
                      setPayments((current) =>
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
                    setPayments((current) =>
                      current.length === 1 ? current : current.filter((item) => item.key !== row.key),
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
                  setPayments((current) => [
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
              <p className={Math.abs(remaining) < 0.01 ? 'text-xs text-success' : 'text-xs text-warning'}>
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
