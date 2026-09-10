import type { DigitalCheck, DigitalCheckRecommendation, Lead } from '../digital-check/types';

export interface EmailDispatchPayload {
  lead: Lead;
  digitalCheck: DigitalCheck;
  recommendations: DigitalCheckRecommendation[];
}

export async function sendLeadResultEmail(payload: EmailDispatchPayload): Promise<{ success: boolean }> {
  // Ponto de extensão para Resend, SendGrid, Postmark ou AWS SES
  const emailApiKey = process.env.EMAIL_API_KEY;
  if (!emailApiKey) {
    return { success: true };
  }

  try {
    // eslint-disable-next-line no-console
    console.log(`[Email Service] Simulação de envio para ${payload.lead.email} - Assunto: "Seu !AI Digital Check está pronto."`);
    return { success: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Email Service] Falha ao enviar e-mail ao lead:', err);
    return { success: false };
  }
}

export async function sendInternalAlertEmail(payload: EmailDispatchPayload): Promise<{ success: boolean }> {
  const internalRecipient = process.env.INTERNAL_ALERT_EMAIL;
  if (!internalRecipient) {
    return { success: true };
  }

  try {
    // eslint-disable-next-line no-console
    console.log(`[Email Service] Alerta interno enviado para ${internalRecipient}: "New problem detected. 👀 (${payload.lead.company})"`);
    return { success: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Email Service] Falha ao enviar alerta interno:', err);
    return { success: false };
  }
}
