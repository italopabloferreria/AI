import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// -------------------------------------------------------------
// RESUME TOKEN CRIPTOGRÁFICO
// -------------------------------------------------------------
// Gera token aleatório de 256 bits (64 hex characters) com alta entropia
export function generateResumeToken(): string {
  return randomBytes(32).toString('hex');
}

// Hash SHA-256 do token para armazenamento seguro no banco (nunca armazenar o token bruto)
export function hashResumeToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

// Verificação em tempo constante (timing-safe) para mitigar timing attacks
export function verifyResumeToken(token: string, expectedHash: string): boolean {
  if (!token || !expectedHash) return false;
  const computedHash = hashResumeToken(token);
  if (computedHash.length !== expectedHash.length) return false;
  try {
    return timingSafeEqual(Buffer.from(computedHash, 'utf8'), Buffer.from(expectedHash, 'utf8'));
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// RATE LIMITING EM MEMÓRIA
// NOTA DE ARQUITETURA: Proteção básica para ambiente local / single-instance.
// Em produção com múltiplas réplicas serverless, substituir por store distribuído (ex: Redis / Upstash).
// -------------------------------------------------------------
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, limit = 15, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

// -------------------------------------------------------------
// SANITIZAÇÃO E VALIDAÇÕES BÁSICAS
// Nota: A segurança SQL é garantida por queries parametrizadas ($1, $2).
// sanitizeString garante limites de payload e remoção de espaços espúrios.
// -------------------------------------------------------------
export function sanitizeString(val: unknown, maxLength = 255): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLength);
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

// Validação e normalização de telefone (prioridade Brasil com suporte a E.164 internacional)
export function normalizePhone(phone: unknown): string {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^\d+]/g, '').trim().slice(0, 30);
}
