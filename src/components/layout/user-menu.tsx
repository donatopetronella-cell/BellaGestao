'use client'

import Link from 'next/link'
import { LogOut, Settings, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import { logoutAction } from '@/server/actions/auth'

export function UserMenu({
  name,
  email,
  roleLabel,
  avatarUrl,
}: {
  name: string
  email: string
  roleLabel: string
  avatarUrl?: string | null
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 hover:bg-[var(--muted)]">
        <Avatar name={name} src={avatarUrl} />
        <span className="sr-only">Abrir menu do usuário</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium text-[var(--foreground)]">{name}</span>
          <span className="block text-xs">{email}</span>
          <span className="mt-1 block text-xs text-brand-600">{roleLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/conta">
            <UserRound className="size-4" /> Minha conta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <Settings className="size-4" /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={logoutAction} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2 text-danger">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
