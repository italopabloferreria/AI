import { changeCRMKey, getCRMKey, isCRMAuthorized, unauthorizedCRMResponse } from '@/lib/crm/auth';

export async function GET(request: Request) {
  if (!isCRMAuthorized(request)) return unauthorizedCRMResponse();
  return Response.json({ googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), usingDefaultKey: getCRMKey() === 'admin123' });
}

export async function PATCH(request: Request) {
  if (!isCRMAuthorized(request)) return unauthorizedCRMResponse();
  try {
    const body = (await request.json()) as { currentKey?: string; nextKey?: string };
    if (!body.currentKey || !body.nextKey || body.nextKey.trim().length < 8) {
      return Response.json({ error: 'A nova chave precisa ter pelo menos 8 caracteres.' }, { status: 400 });
    }
    if (!changeCRMKey(body.currentKey, body.nextKey)) {
      return Response.json({ error: 'Chave atual inválida.' }, { status: 401 });
    }
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Não foi possível alterar a chave.' }, { status: 400 });
  }
}
