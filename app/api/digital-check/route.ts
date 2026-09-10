import { generateResumeToken, hashResumeToken } from '@/lib/digital-check/security';
import { getRepository } from '@/lib/digital-check/storage';
import { parseJsonBody } from '@/lib/digital-check/validation';

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.success) {
      return parsed.response;
    }

    const body = parsed.data as Record<string, unknown>;
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';

    if (!leadId) {
      return Response.json({ error: 'leadId é obrigatório para iniciar a sessão.' }, { status: 400 });
    }

    const storage = getRepository();

    // 1. Validar que leadId existe antes de criar Digital Check (ITEM 38)
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return Response.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    // 2. Gerar token de retomada criptograficamente seguro (ITEM 3)
    const resumeToken = generateResumeToken();
    const resumeTokenHash = hashResumeToken(resumeToken);

    // 3. Persistir sessão associada ao lead (armazenando SOMENTE o hash)
    const digitalCheck = await storage.createDigitalCheck({
      leadId,
      resumeTokenHash,
    });

    // 4. Retornar token bruto exclusivamente ao cliente que iniciou a sessão
    return Response.json(
      {
        digitalCheckId: digitalCheck.id,
        resumeToken,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[POST /api/digital-check error]:', err);
    return Response.json(
      { error: 'Não conseguimos preparar seu Digital Check agora. Tente novamente em alguns instantes.' },
      { status: 500 }
    );
  }
}
