import type { DigitalCheck, DigitalCheckRecommendation, Lead } from '../digital-check/types';

export interface CRMDispatchPayload {
  lead: Lead;
  digitalCheck: DigitalCheck;
  recommendations: DigitalCheckRecommendation[];
}

export async function dispatchToCRM(payload: CRMDispatchPayload): Promise<{ success: boolean; id?: string }> {
  // Ponto de extensão para integrações futuras com HubSpot, RD Station, ActiveCampaign ou Webhook
  const crmWebhookUrl = process.env.CRM_WEBHOOK_URL;
  if (!crmWebhookUrl) {
    return { success: true };
  }

  try {
    const res = await fetch(crmWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { success: res.ok };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[CRM Service] Falha ao despachar para webhook externo:', err);
    return { success: false };
  }
}
