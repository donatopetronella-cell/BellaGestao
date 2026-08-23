'use client'

import { useActionState, useState } from 'react'
import { FileUp } from 'lucide-react'
import { importClientsAction } from '@/server/actions/clients'
import { idleFormState } from '@/server/actions/types'
import { parseClientsCsv, type ParsedImport } from '../import'
import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

/**
 * Preview happens in the browser for instant feedback; the same parser runs
 * again on the server before anything is written.
 */
export function ImportForm() {
  const [state, formAction] = useActionState(importClientsAction, idleFormState)
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState<ParsedImport | null>(null)
  const [fileName, setFileName] = useState('')

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) {
      setContent('')
      setPreview(null)
      setFileName('')
      return
    }
    const text = await file.text()
    setFileName(file.name)
    setContent(text)
    setPreview(parseClientsCsv(text))
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="content" value={content} />

      {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}
      {state.status === 'success' ? (
        <Alert variant="success">{state.message}</Alert>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="file" className="text-sm font-medium">
          Arquivo CSV
        </label>
        <Input
          id="file"
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(event) => void handleFile(event.target.files?.[0])}
          className="file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1 file:text-xs"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Cabeçalho aceito: <code>nome, telefone, email, aniversario</code>. Planilhas
          do Excel devem ser salvas como CSV.
        </p>
      </div>

      {preview ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-[var(--muted)] px-3 py-1.5">
              {fileName}
            </span>
            <span className="rounded-lg bg-success/10 px-3 py-1.5 text-success">
              {preview.rows.length} linha(s) válida(s)
            </span>
            {preview.issues.length > 0 ? (
              <span className="rounded-lg bg-warning/10 px-3 py-1.5 text-warning">
                {preview.issues.length} linha(s) com problema
              </span>
            ) : null}
          </div>

          {preview.issues.length > 0 ? (
            <Alert variant="info" title="Linhas que não serão importadas">
              <ul className="list-inside list-disc space-y-0.5 text-xs">
                {preview.issues.slice(0, 8).map((issue) => (
                  <li key={`${issue.line}-${issue.message}`}>
                    Linha {issue.line}: {issue.message}
                  </li>
                ))}
                {preview.issues.length > 8 ? (
                  <li>…e mais {preview.issues.length - 8}.</li>
                ) : null}
              </ul>
            </Alert>
          ) : null}

          {preview.rows.length > 0 ? (
            <div className="rounded-xl2 border border-[var(--border)]">
              <Table>
                <THead>
                  <TR>
                    <TH>Nome</TH>
                    <TH>Telefone</TH>
                    <TH>E-mail</TH>
                    <TH>Aniversário</TH>
                  </TR>
                </THead>
                <TBody>
                  {preview.rows.slice(0, 10).map((row) => (
                    <TR key={row.line}>
                      <TD className="font-medium">{row.name}</TD>
                      <TD>{row.phone ?? '—'}</TD>
                      <TD>{row.email ?? '—'}</TD>
                      <TD>{row.birthDate ?? '—'}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              {preview.rows.length > 10 ? (
                <p className="p-3 text-xs text-[var(--muted-foreground)]">
                  Mostrando as 10 primeiras de {preview.rows.length}.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <SubmitButton disabled={!preview || preview.rows.length === 0}>
        <FileUp className="size-4" /> Importar {preview?.rows.length ?? 0} cliente(s)
      </SubmitButton>
    </form>
  )
}
