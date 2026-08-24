import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createWhatsappTemplate,
  listWhatsappMessages,
  listWhatsappTemplates,
  sendWhatsappToClient,
  setWhatsappTemplateActive,
} from '@/features/whatsapp/service'
import { AppError } from '@/lib/errors'
import { disconnectDb } from '@/lib/db'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

describe('whatsapp', () => {
  let tenant: TestTenant

  beforeAll(async () => {
    tenant = await createTestTenant('whatsapp')
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('cria modelo, extrai variáveis e recusa código duplicado', async () => {
    const templateId = await createWhatsappTemplate(tenant.tenantId, {
      code: 'lembrete_teste',
      name: 'Lembrete de teste',
      category: 'UTILITY',
      body: 'Oi {{cliente}}, seu horário é {{hora}}.',
      isActive: true,
    })
    const templates = await listWhatsappTemplates(tenant.tenantId)
    const created = templates.find((template) => template.id === templateId)
    expect(created?.variables).toEqual(['cliente', 'hora'])

    await expect(
      createWhatsappTemplate(tenant.tenantId, {
        code: 'lembrete_teste',
        name: 'Outro',
        category: 'UTILITY',
        body: 'Oi',
        isActive: true,
      }),
    ).rejects.toThrow(AppError)
  })

  it('desativa modelo e recusa envio com modelo inativo', async () => {
    const templateId = await createWhatsappTemplate(tenant.tenantId, {
      code: 'aniversario_teste',
      name: 'Aniversário',
      category: 'MARKETING',
      body: 'Feliz aniversário, {{cliente}}!',
      isActive: true,
    })
    await setWhatsappTemplateActive(tenant.tenantId, templateId, false)
    await expect(sendWhatsappToClient(tenant.tenantId, tenant.clientId, templateId)).rejects.toThrow(
      /inativo/,
    )
  })

  it('envia mensagem para cliente com telefone e registra o status', async () => {
    const templateId = await createWhatsappTemplate(tenant.tenantId, {
      code: 'confirmacao_teste',
      name: 'Confirmação',
      category: 'UTILITY',
      body: 'Olá {{cliente}}, confirmado!',
      isActive: true,
    })

    const messageId = await sendWhatsappToClient(tenant.tenantId, tenant.clientId, templateId)
    expect(messageId).toBeTruthy()

    const messages = await listWhatsappMessages(tenant.tenantId)
    const sent = messages.items.find((message) => message.id === messageId)
    expect(sent?.status).toBe('SENT')
    expect(sent?.body).toContain('confirmado')
  })
})
