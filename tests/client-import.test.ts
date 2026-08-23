import { describe, expect, it } from 'vitest'
import { normalizeImportedDate, parseClientsCsv } from '@/features/clients/import'

describe('importação de clientes (CSV)', () => {
  it('detecta colunas por nome, aceitando variações e acentos', () => {
    const csv = `Nome;Telefone;E-mail;Aniversário
Mariana Alves;(11) 99999-0000;mariana@email.com;25/08/1990
Beatriz Gomes;(11) 98888-1234;;13/02/1988`
    const result = parseClientsCsv(csv)
    expect(result.issues).toEqual([])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toMatchObject({
      name: 'Mariana Alves',
      phone: '(11) 99999-0000',
      birthDate: '1990-08-25',
    })
  })

  it('aceita vírgula e detecta o delimitador automaticamente', () => {
    const csv = `nome,telefone,email\nAna Costa,11988887777,ana@x.com`
    const result = parseClientsCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.name).toBe('Ana Costa')
  })

  it('rejeita arquivo sem a coluna nome', () => {
    const csv = `telefone;email\n11999990000;a@b.com`
    const result = parseClientsCsv(csv)
    expect(result.rows).toEqual([])
    expect(result.issues[0]?.message).toMatch(/nome/i)
  })

  it('reporta e pula linhas com data de nascimento inválida', () => {
    const csv = `nome;aniversario\nCliente Teste;32/13/2020`
    const result = parseClientsCsv(csv)
    expect(result.rows).toEqual([])
    expect(result.issues[0]?.message).toMatch(/data de nascimento inválida/i)
  })

  it('detecta telefone repetido dentro do próprio arquivo', () => {
    const csv = `nome;telefone\nCliente 1;11999990000\nCliente 2;11999990000`
    const result = parseClientsCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.issues[0]?.message).toMatch(/repetido/i)
  })

  it('normaliza datas em formato brasileiro e ISO', () => {
    expect(normalizeImportedDate('25/08/1990')).toBe('1990-08-25')
    expect(normalizeImportedDate('1990-08-25')).toBe('1990-08-25')
    expect(normalizeImportedDate('31/02/1990')).toBeNull()
    expect(normalizeImportedDate('não é data')).toBeNull()
  })

  it('arquivo vazio não quebra o parser', () => {
    const result = parseClientsCsv('')
    expect(result.rows).toEqual([])
    expect(result.issues.length).toBeGreaterThan(0)
  })
})
