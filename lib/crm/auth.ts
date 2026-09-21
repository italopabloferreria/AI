const CRM_KEY_HEADER = 'x-crm-admin-key';
const DEFAULT_CRM_KEY = 'admin123';
const state = globalThis as typeof globalThis & { __AI_CRM_KEY__?: string };

export function getCRMKey(): string {
  return state.__AI_CRM_KEY__ || process.env.CRM_ADMIN_KEY || DEFAULT_CRM_KEY;
}

export function isCRMAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV === 'production' && !process.env.CRM_ADMIN_KEY && !state.__AI_CRM_KEY__) {
    return false;
  }
  return request.headers.get(CRM_KEY_HEADER) === getCRMKey();
}

export function unauthorizedCRMResponse() {
  return Response.json({ error: 'Acesso ao CRM não autorizado.' }, { status: 401 });
}

export function changeCRMKey(currentKey: string, nextKey: string): boolean {
  if (currentKey !== getCRMKey() || nextKey.trim().length < 8) return false;
  state.__AI_CRM_KEY__ = nextKey.trim();
  return true;
}
