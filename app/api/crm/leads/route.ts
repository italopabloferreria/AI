import { isCRMAuthorized, unauthorizedCRMResponse } from '@/lib/crm/auth';
import { getRepository, type CRMLeadStatus } from '@/lib/digital-check/storage';

const STATUSES = new Set<CRMLeadStatus>(['created', 'qualified', 'contacted', 'proposal', 'won', 'lost']);

export async function GET(request: Request) {
  if (!isCRMAuthorized(request)) return unauthorizedCRMResponse();
  try {
    const url = new URL(request.url);
    const leads = await getRepository().listCRMLeads({
      search: url.searchParams.get('search')?.trim() || undefined,
      status: url.searchParams.get('status') || undefined,
    });
    return Response.json({ leads });
  } catch (error) {
    console.error('[GET /api/crm/leads error]:', error);
    return Response.json({ error: 'Não foi possível carregar os leads.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isCRMAuthorized(request)) return unauthorizedCRMResponse();
  try {
    const body = (await request.json()) as { leadId?: string; status?: string };
    if (!body.leadId || !body.status || !STATUSES.has(body.status as CRMLeadStatus)) {
      return Response.json({ error: 'Lead e etapa válida são obrigatórios.' }, { status: 400 });
    }
    const lead = await getRepository().updateLeadStatus(body.leadId, body.status as CRMLeadStatus);
    if (!lead) return Response.json({ error: 'Lead não encontrado.' }, { status: 404 });
    return Response.json({ lead });
  } catch (error) {
    console.error('[PATCH /api/crm/leads error]:', error);
    return Response.json({ error: 'Não foi possível atualizar a etapa.' }, { status: 500 });
  }
}
