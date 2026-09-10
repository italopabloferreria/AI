import { checkRateLimit } from '@/lib/digital-check/security';
import { getRepository } from '@/lib/digital-check/storage';
import { parseJsonBody, validateCreateLeadPayload } from '@/lib/digital-check/validation';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    if (!checkRateLimit(ip, 15)) {
      return Response.json(
        { error: 'Muitas solicitações. Aguarde um instante e tente novamente.' },
        { status: 429 }
      );
    }

    // 1. Parsing seguro do JSON (trata JSON inválido e Content-Type)
    const parsed = await parseJsonBody(request);
    if (!parsed.success) {
      return parsed.response;
    }

    // 2. Validação estrita de payload (incluindo consent === true literal)
    const validation = validateCreateLeadPayload(parsed.data);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // 3. Obtenção do repositório e persistência
    const storage = getRepository();
    const lead = await storage.createLead(validation.data);

    return Response.json({ leadId: lead.id }, { status: 201 });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[POST /api/leads error]:', err);

    // Mensagem pública segura (ITEM 16): nunca expor DATABASE_URL ou detalhes internos
    return Response.json(
      { error: 'Não conseguimos preparar seu Digital Check agora. Tente novamente em alguns instantes.' },
      { status: 500 }
    );
  }
}
