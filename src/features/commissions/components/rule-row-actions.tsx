'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { deleteCommissionRuleAction } from '@/server/actions/commissions'
import type { CommissionRuleRow } from '../service'
import { RuleDialog, type RuleDialogOption } from './rule-dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function RuleRowActions({
  rule,
  professionals,
  products,
}: {
  rule: CommissionRuleRow
  professionals: RuleDialogOption[]
  products: RuleDialogOption[]
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <RuleDialog
        rule={rule}
        professionals={professionals}
        products={products}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Editar regra">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon" aria-label="Remover regra" className="text-danger">
            <Trash2 className="size-4" />
          </Button>
        }
        title="Remover regra de comissão?"
        description="As comissões já calculadas não são afetadas."
        action={deleteCommissionRuleAction}
        hiddenFields={{ ruleId: rule.id }}
        confirmLabel="Remover"
      />
    </div>
  )
}
