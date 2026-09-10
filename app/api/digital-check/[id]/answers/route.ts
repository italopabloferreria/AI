import { verifyResumeToken } from '@/lib/digital-check/security';
import { getRepository } from '@/lib/digital-check/storage';
import { parseJsonBody, validateSaveAnswerPayload } from '@/lib/digital-check/validation';

async function handleSaveAnswer(
  request: Request,
  params: Promise<{ id: string }>
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

    // 2. Bloquear alteração após conclusão (ITEM 36)
    if (check.status === 'completed') {
      return Response.json(
        { error: 'Não é possível alterar respostas de um Digital Check já concluído.' },
        { status: 409 }
      );
    }

    // 3. Parsing seguro do corpo da requisição (ITEM 19)
    const parsed = await parseJsonBody(request);
    if (!parsed.success) {
      return parsed.response;
    }

    // 4. Validação estrita do questionKey e formato da resposta (ITEM 30 e 31)
    const validation = validateSaveAnswerPayload(parsed.data);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // 5. UPSERT idempotente da resposta e atualização do current_step (ITEM 2 e 9)
    const saved = await storage.upsertAnswer(
      id,
      validation.data.questionKey,
      validation.data.answerJson,
      validation.data.nextStep
    );

    return Response.json({
      success: true,
      answer: {
        questionKey: saved.questionKey,
        answerJson: saved.answerJson,
      },
    });
  } catch (err: unknown) {
    if ((err as any)?.statusCode === 409) {
      return Response.json({ error: (err as Error).message }, { status: 409 });
    }
    // eslint-disable-next-line no-console
    console.error('[answers route error]:', err);
    return Response.json(
      { error: 'Falha ao salvar resposta. Tente novamente.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSaveAnswer(request, params);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSaveAnswer(request, params);
}
