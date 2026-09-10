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
      request.headers.get('x-resume-token')?.trim() ||
      request.headers.get('authorization')?.replace('Bearer ', '')?.trim() ||
      '';

    // 1. Validação estrita do token de retomada (ITEM 3)
    if (!token) {
      return Response.json({ error: 'Token de autorização ausente.' }, { status: 401 });
    }

    const storage = getRepository();
    const check = await storage.getDigitalCheck(id);
    if (!check) {
      return Response.json({ error: 'Sessão de Digital Check não encontrada.' }, { status: 404 });
    }

    if (!verifyResumeToken(token, check.resumeTokenHash)) {
      return Response.json({ error: 'Acesso não autorizado para esta sessão.' }, { status: 403 });
    }

    // 2. Conclusão Atômica e Idempotente (ITEM 10, ITEM 11 e ITEM 12)
    // Usa transação PostgreSQL com row-level lock (FOR UPDATE).
    // Se já concluído: retorna check existente e recomendações existentes sem recalcular nem alterar completed_at.
    const result = await storage.completeDigitalCheckAtomic(id, (answers) =>
      runDiagnosticEngine(id, answers)
    );

    // 3. Integração assíncrona desacoplada (se não foi completado anteriormente)
    if (!result.alreadyCompleted) {
      void (async () => {
        try {
          const lead = await storage.getLead(check.leadId);
          if (lead) {
            const payload = {
              lead,
              digitalCheck: result.check,
              recommendations: result.recommendations,
            };
            await dispatchToCRM(payload).catch(() => {});
            await sendLeadResultEmail(payload).catch(() => {});
            await sendInternalAlertEmail(payload).catch(() => {});
          }
        } catch {
          // Erro silencioso em serviços de terceiros para não afetar o lead
        }
      })();
    }

    return Response.json({
      success: true,
      score: result.check.score || 0,
      primaryOpportunity: result.check.primaryOpportunity || 'AUTOMATE',
      recommendations: result.recommendations,
      alreadyCompleted: result.alreadyCompleted,
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[POST /api/digital-check/[id]/complete error]:', err);
    return Response.json(
      { error: 'Não foi possível processar o diagnóstico. Tente novamente.' },
      { status: 500 }
    );
  }
}
