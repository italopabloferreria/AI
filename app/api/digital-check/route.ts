import { NextResponse } from 'next/server';
import { generateResumeToken, hashResumeToken } from '@/lib/digital-check/security';
import { getRepository } from '@/lib/digital-check/storage';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, any>;
    const leadId = String(body.leadId || '').trim();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId é obrigatório para iniciar a sessão.' }, { status: 400 });
    }

    const storage = getRepository();
    let lead = await storage.getLead(leadId);

    if (!lead && body.leadData) {
      const now = new Date().toISOString();
      lead = await storage.createLead({
        name: String(body.leadData.name || 'Lead').trim(),
        company: String(body.leadData.company || 'Empresa').trim(),
        email: String(body.leadData.email || '').trim(),
        whatsapp: String(body.leadData.whatsapp || body.leadData.phone || '').trim(),
        websiteOrInstagram: body.leadData.website ? String(body.leadData.website).trim() : undefined,
        initialProblem: String(body.leadData.message || body.leadData.initialProblem || 'Diagnóstico').trim(),
        consent: true,
        consentAt: now,
        privacyPolicyVersion: '2026.1',
      });
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    // Gerar token de retomada criptográfico seguro
    const resumeToken = generateResumeToken();
    const resumeTokenHash = hashResumeToken(resumeToken);

    const digitalCheck = await storage.createDigitalCheck({
      leadId,
      resumeTokenHash,
    });

    return NextResponse.json(
      {
        digitalCheckId: digitalCheck.id,
        resumeToken,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[POST /api/digital-check error]:', err);
    return NextResponse.json(
      { error: 'Não foi possível iniciar a sessão de diagnóstico.' },
      { status: 500 }
    );
  }
}
