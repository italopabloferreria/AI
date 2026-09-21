import { isCRMAuthorized, unauthorizedCRMResponse } from '@/lib/crm/auth';
import { getRepository } from '@/lib/digital-check/storage';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isCRMAuthorized(request)) return unauthorizedCRMResponse();
  try {
    const { id } = await params;
    const detail = await getRepository().getCRMLeadDetail(id);
    if (!detail) return Response.json({ error: 'Lead não encontrado.' }, { status: 404 });
    return Response.json(detail);
  } catch (error) {
    console.error('[GET /api/crm/leads/[id] error]:', error);
    return Response.json({ error: 'Não foi possível carregar o detalhe do lead.' }, { status: 500 });
  }
}
