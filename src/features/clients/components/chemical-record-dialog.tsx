'use client'

import { useState } from 'react'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { createChemicalRecordAction } from '@/server/actions/clients'
import { PROCEDURE_LABELS } from '@/validators/client'
import type { SavedFormula } from '../service'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface FormulaRow {
  key: string
  tone: string
  grams: string
}

function emptyRow(): FormulaRow {
  return { key: crypto.randomUUID(), tone: '', grams: '' }
}

export function ChemicalRecordDialog({
  clientId,
  professionals,
  formulas,
}: {
  clientId: string
  professionals: Array<{ id: string; name: string }>
  formulas: SavedFormula[]
}) {
  const [rows, setRows] = useState<FormulaRow[]>([emptyRow()])
  const [procedure, setProcedure] = useState('COLORING')
  const [brand, setBrand] = useState('')
  const [oxidantVolume, setOxidantVolume] = useState('')
  const [oxidantMl, setOxidantMl] = useState('')
  const [pauseMinutes, setPauseMinutes] = useState('')

  function applyFormula(formula: SavedFormula): void {
    setProcedure(formula.procedure)
    setBrand(formula.brand ?? '')
    setOxidantVolume(formula.oxidantVolume ? String(formula.oxidantVolume) : '')
    setOxidantMl(formula.oxidantMl ? String(formula.oxidantMl) : '')
    setPauseMinutes(formula.pauseMinutes ? String(formula.pauseMinutes) : '')
    setRows(
      formula.items.length > 0
        ? formula.items.map((item) => ({
            key: crypto.randomUUID(),
            tone: item.tone,
            grams: String(item.grams),
          }))
        : [emptyRow()],
    )
  }

  return (
    <FormDialog
      trigger={
        <Button>
          <Plus className="size-4" /> Novo registro
        </Button>
      }
      title="Registro do histórico químico"
      description="Fórmula, oxidante e tempo de pausa para repetir o resultado com segurança."
      action={createChemicalRecordAction}
      submitLabel="Salvar registro"
      className="max-h-[90dvh] max-w-2xl overflow-y-auto"
    >
      {(state) => (
        <>
          <input type="hidden" name="clientId" value={clientId} />

          {formulas.length > 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-medium">
                <Wand2 className="size-3.5" /> Reutilizar fórmula anterior
              </p>
              <div className="flex flex-wrap gap-2">
                {formulas.slice(0, 6).map((formula) => (
                  <button
                    key={formula.id}
                    type="button"
                    onClick={() => applyFormula(formula)}
                    className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs hover:bg-[var(--accent)]"
                  >
                    {formula.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Procedimento" name="procedure">
              <Select
                id="procedure"
                name="procedure"
                value={procedure}
                onChange={(event) => setProcedure(event.target.value)}
              >
                {Object.entries(PROCEDURE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Data"
              name="performedAt"
              error={state.fieldErrors?.performedAt}
            >
              <Input
                id="performedAt"
                name="performedAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </FormField>

            <FormField label="Marca" name="brand">
              <Input
                id="brand"
                name="brand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="Ex.: Wella"
              />
            </FormField>

            <FormField label="Produto" name="productName">
              <Input id="productName" name="productName" placeholder="Ex.: Koleston" />
            </FormField>

            <FormField label="Profissional" name="professionalId">
              <Select id="professionalId" name="professionalId" defaultValue="">
                <option value="">Não informado</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Fórmula</legend>
            {rows.map((row, index) => (
              <div key={row.key} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-[var(--muted-foreground)]" htmlFor={`tone-${index}`}>
                    Tonalidade
                  </label>
                  <Input
                    id={`tone-${index}`}
                    name="tone"
                    value={row.tone}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.key === row.key
                            ? { ...item, tone: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="7.1"
                  />
                </div>
                <div className="w-28">
                  <label className="text-xs text-[var(--muted-foreground)]" htmlFor={`grams-${index}`}>
                    Gramas
                  </label>
                  <Input
                    id={`grams-${index}`}
                    name="grams"
                    type="number"
                    min={0}
                    step="1"
                    value={row.grams}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.key === row.key
                            ? { ...item, grams: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="40"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover linha da fórmula"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((current) => [...current, emptyRow()])}
            >
              <Plus className="size-4" /> Adicionar tonalidade
            </Button>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Oxidante (volumes)" name="oxidantVolume">
              <Input
                id="oxidantVolume"
                name="oxidantVolume"
                type="number"
                min={0}
                max={60}
                value={oxidantVolume}
                onChange={(event) => setOxidantVolume(event.target.value)}
                placeholder="20"
              />
            </FormField>
            <FormField label="Oxidante (ml)" name="oxidantMl">
              <Input
                id="oxidantMl"
                name="oxidantMl"
                type="number"
                min={0}
                value={oxidantMl}
                onChange={(event) => setOxidantMl(event.target.value)}
                placeholder="60"
              />
            </FormField>
            <FormField label="Tempo de pausa (min)" name="pauseMinutes">
              <Input
                id="pauseMinutes"
                name="pauseMinutes"
                type="number"
                min={0}
                max={300}
                value={pauseMinutes}
                onChange={(event) => setPauseMinutes(event.target.value)}
                placeholder="35"
              />
            </FormField>
          </div>

          <FormField label="Resultado" name="result">
            <Input id="result" name="result" placeholder="Ex.: cobertura total dos brancos" />
          </FormField>

          <FormField label="Observações" name="notes">
            <Textarea id="notes" name="notes" />
          </FormField>

          <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="saveAsFormula" defaultChecked />
              Salvar como fórmula reutilizável
            </label>
            <Input name="formulaName" placeholder="Nome da fórmula (opcional)" />
          </div>
        </>
      )}
    </FormDialog>
  )
}
