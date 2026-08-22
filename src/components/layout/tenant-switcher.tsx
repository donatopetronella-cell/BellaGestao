'use client'

import { Building2, Check, ChevronsUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { switchTenantAction } from '@/server/actions/auth'

export interface TenantOption {
  tenantId: string
  tenantName: string
}

export function TenantSwitcher({
  current,
  options,
}: {
  current: TenantOption
  options: TenantOption[]
}) {
  if (options.length <= 1) {
    return (
      <span className="flex items-center gap-2 text-sm font-medium">
        <Building2 className="size-4 text-brand-600" />
        {current.tenantName}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-[var(--muted)]">
        <Building2 className="size-4 text-brand-600" />
        <span className="max-w-40 truncate">{current.tenantName}</span>
        <ChevronsUpDown className="size-3.5 text-[var(--muted-foreground)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Seus estabelecimentos</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem key={option.tenantId} asChild>
            <form action={switchTenantAction} className="w-full">
              <input type="hidden" name="tenantId" value={option.tenantId} />
              <button type="submit" className="flex w-full items-center gap-2">
                {option.tenantId === current.tenantId ? (
                  <Check className="size-4 text-brand-600" />
                ) : (
                  <span className="size-4" />
                )}
                <span className="truncate">{option.tenantName}</span>
              </button>
            </form>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
