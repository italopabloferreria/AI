import { NextResponse } from 'next/server';
import { DIGITAL_CHECK_QUESTIONS } from '@/lib/digital-check/questions';
import { verifyResumeToken } from '@/lib/digital-check/security';
import { getRepository } from '@/lib/digital-check/storage';

export async function PATCH(
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

    const body = (await request.json()) as Record<string, any>;
    const questionKey = String(body.questionKey || '').trim();
    const answerJson = body.answerJson;

    const validQuestion = DIGITAL_CHECK_QUESTIONS.find((q) => q.key === questionKey);
    if (!validQuestion) {
      return NextResponse.json({ error: 'Chave de pergunta inválida.' }, { status: 400 });
    }

    if (answerJson === undefined || answerJson === null) {
      return NextResponse.json({ error: 'Conteúdo da resposta é obrigatório.' }, { status: 400 });
    }

    // UPSERT idempotente da resposta
    const saved = await storage.upsertAnswer(id, questionKey, answerJson);

    return NextResponse.json({
      success: true,
      answer: {
        questionKey: saved.questionKey,
        answerJson: saved.answerJson,
      },
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[PATCH /api/digital-check/[id]/answers error]:', err);
    return NextResponse.json({ error: 'Falha ao salvar resposta. Tente novamente.' }, { status: 500 });
  }
}
