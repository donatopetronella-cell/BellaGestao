import type { LucideIcon } from 'lucide-react'
import { Check, CircleDashed } from 'lucide-react'
import { PageHeader } from './page-header'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Modules whose data model already exists in the database but whose screens
 * land in a later phase. Shows exactly what is ready and what comes next
 * instead of a fake interface.
 */
export function ModulePreview({
  title,
  description,
  phase,
  icon: Icon,
  ready,
  planned,
  children,
}: {
  title: string
  description: string
  phase: string
  icon: LucideIcon
  ready: string[]
  planned: string[]
  children?: React.ReactNode
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="outline">{phase}</Badge>}
      />

      {children}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className="size-4 text-brand-600" /> Já disponível no banco de dados
            </CardTitle>
            <CardDescription>
              As tabelas, os índices e as políticas de isolamento por salão já
              estão criadas e migradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {ready.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos passos deste módulo</CardTitle>
            <CardDescription>Entregas planejadas para {phase}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {planned.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[var(--muted-foreground)]">
                  <CircleDashed className="mt-0.5 size-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
