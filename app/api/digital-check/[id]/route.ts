import { verifyResumeToken } from '@/lib/digital-check/security';
import { getRepository } from '@/lib/digital-check/storage';

export async function GET(
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

    // 2. Verificação de hash em tempo constante (timing-safe)
    if (!verifyResumeToken(token, check.resumeTokenHash)) {
      return Response.json({ error: 'Acesso não autorizado para esta sessão.' }, { status: 403 });
    }

    const [answers, lead, recommendations] = await Promise.all([
      storage.getAnswers(id),
      storage.getLead(check.leadId),
      check.status === 'completed' ? storage.getRecommendations(id) : Promise.resolve([]),
    ]);

    // 3. Resposta higienizada: NUNCA expor resume_token_hash, email completo ou dados internos (ITEM 3)
    return Response.json({
      digitalCheck: {
        id: check.id,
        status: check.status,
        currentStep: check.currentStep,
        score: check.score,
        primaryOpportunity: check.primaryOpportunity,
      },
      lead: lead
        ? {
            name: lead.name,
            company: lead.company,
            websiteOrInstagram: lead.websiteOrInstagram,
          }
        : null,
      answers: answers.map((a) => ({
        questionKey: a.questionKey,
        answerJson: a.answerJson,
      })),
      recommendations,
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[GET /api/digital-check/[id] error]:', err);
    return Response.json(
      { error: 'Não foi possível consultar a sessão. Tente novamente.' },
      { status: 500 }
    );
  }
}
