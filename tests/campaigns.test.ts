import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createCampaign, listCampaigns, previewCampaignTargets, sendCampaign } from '@/features/campaigns/service'
import { createWhatsappTemplate, listWhatsappMessages } from '@/features/whatsapp/service'
import { AppError } from '@/lib/errors'
import { disconnectDb, getAdminDb } from '@/lib/db'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

describe('campanhas', () => {
  let tenant: TestTenant
  let templateId: string

  beforeAll(async () => {
    tenant = await createTestTenant('campaigns')
    templateId = await createWhatsappTemplate(tenant.tenantId, {
      code: 'reativacao_teste',
      name: 'Reativação',
      category: 'MARKETING',
      body: 'Sentimos sua falta, {{cliente}}!',
      isActive: true,
    })
    await getAdminDb().client.update({
      where: { id: tenant.clientId },
      data: { marketingConsent: true, lastVisitAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) },
    })
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('conta público de reativação e cria campanha em rascunho', async () => {
    const count = await previewCampaignTargets(tenant.tenantId, 'REACTIVATION', { inactiveDays: 90 })
    expect(count).toBe(1)

    const campaignId = await createCampaign(tenant.tenantId, {
      name: 'Reativação teste',
      type: 'REACTIVATION',
      templateId,
      inactiveDays: 90,
    })
    const campaigns = await listCampaigns(tenant.tenantId)
    const created = campaigns.find((campaign) => campaign.id === campaignId)
    expect(created?.status).toBe('DRAFT')
  })

  it('envia a campanha, cria mensagens e não deixa enviar duas vezes', async () => {
    const campaignId = await createCampaign(tenant.tenantId, {
      name: 'Reativação envio',
      type: 'REACTIVATION',
      templateId,
      inactiveDays: 90,
    })

    const sent = await sendCampaign(tenant.tenantId, campaignId)
    expect(sent).toBe(1)

    const messages = await listWhatsappMessages(tenant.tenantId)
    expect(messages.items.some((message) => message.status === 'SENT')).toBe(true)

    await expect(sendCampaign(tenant.tenantId, campaignId)).rejects.toThrow(AppError)
  })

  it('não envia campanha sem público elegível', async () => {
    const campaignId = await createCampaign(tenant.tenantId, {
      name: 'Aniversariantes vazio',
      type: 'BIRTHDAY',
      templateId,
      birthdayMonth: 1,
    })
    await expect(sendCampaign(tenant.tenantId, campaignId)).rejects.toThrow(AppError)
  })
})
