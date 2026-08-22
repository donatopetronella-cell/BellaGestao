import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
        <Compass className="size-6" />
      </span>
      <h1 className="font-display text-3xl">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
        O endereço acessado não existe ou foi movido.
      </p>
      <Button asChild>
        <Link href="/painel">Ir para o painel</Link>
      </Button>
    </div>
  )
}
