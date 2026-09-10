import { NextResponse } from 'next/server';
import { runDiagnosticEngine } from '@/lib/digital-check/engine';
import { verifyResumeToken } from '@/lib/digital-check/security';
import { getRepository } from '@/lib/digital-check/storage';
import { dispatchToCRM } from '@/lib/services/crm';
import { sendInternalAlertEmail, sendLeadResultEmail } from '@/lib/services/email';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token =
      request.headers.get('x-resume-token') ||
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      '';

    if (!token) {
      return NextResponse.json({ error: 'Token de autorização ausente.' }, { status: 401 });
    }

    const storage = getRepository();
    const check = await storage.getDigitalCheck(id);
    if (!check) {
      return NextResponse.json({ error: 'Sessão de Digital Check não encontrada.' }, { status: 404 });
    }

    if (!verifyResumeToken(token, check.resumeTokenHash)) {
      return NextResponse.json({ error: 'Acesso não autorizado para esta sessão.' }, { status: 403 });
    }

    // 1. Idempotência: Se já concluído, retorna os resultados existentes sem duplicar
    if (check.status === 'completed') {
      const existingRecs = await storage.getRecommendations(id);
      return NextResponse.json({
        success: true,
        score: check.score || 0,
        primaryOpportunity: check.primaryOpportunity || 'AUTOMATE',
        recommendations: existingRecs,
        alreadyCompleted: true,
      });
    }

    // 2. Coletar respostas e rodar a Rule-Based Engine
    const answers = await storage.getAnswers(id);
    const diagnostic = runDiagnosticEngine(id, answers);

    // 3. Persistir recomendações e finalizar sessão
    await storage.saveRecommendations(id, diagnostic.recommendations);
    const updatedCheck = await storage.completeDigitalCheck(
      id,
      diagnostic.score,
      diagnostic.primaryOpportunity
    );

    // 4. Integração assíncrona desacoplada (CRM e Notificações)
    const lead = await storage.getLead(check.leadId);
    if (lead) {
      const payload = {
        lead,
        digitalCheck: updatedCheck,
        recommendations: diagnostic.recommendations,
      };
      // Não bloqueia a resposta do usuário caso o webhook externo falhe
      void dispatchToCRM(payload);
      void sendLeadResultEmail(payload);
      void sendInternalAlertEmail(payload);
    }

    return NextResponse.json({
      success: true,
      score: diagnostic.score,
      primaryOpportunity: diagnostic.primaryOpportunity,
      recommendations: diagnostic.recommendations,
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[POST /api/digital-check/[id]/complete error]:', err);
    return NextResponse.json({ error: 'Falha ao processar o diagnóstico.' }, { status: 500 });
  }
}
