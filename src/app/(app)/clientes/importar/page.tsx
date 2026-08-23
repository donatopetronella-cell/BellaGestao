import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ImportForm } from '@/features/clients/components/import-form'
import { PageHeader } from '@/components/layout/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = { title: 'Importar clientes' }

export default async function ImportClientsPage() {
  await requirePermission('clients.create')

  return (
    <>
      <Link
        href="/clientes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" /> Clientes
      </Link>

      <PageHeader
        title="Importar clientes"
        description="Traga sua lista atual em poucos segundos, com validação antes de gravar."
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Arquivo</CardTitle>
            <CardDescription>
              Conferimos cada linha e mostramos o que será importado antes de salvar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportForm />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Como preparar o arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>A primeira linha precisa ser o cabeçalho. Exemplo:</p>
            <pre className="overflow-x-auto rounded-lg bg-[var(--muted)] p-3 text-xs text-[var(--foreground)]">
{`nome;telefone;email;aniversario
Mariana Alves;(11) 99999-0000;mariana@email.com;25/08/1990
Beatriz Gomes;(11) 98888-1234;;13/02/1988`}
            </pre>
            <ul className="list-inside list-disc space-y-1">
              <li>Aceitamos ponto e vírgula, vírgula ou tabulação como separador.</li>
              <li>Datas em 25/08/1990 ou 1990-08-25.</li>
              <li>Clientes com telefone já cadastrado são ignoradas.</li>
              <li>Até 2.000 linhas por arquivo.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
