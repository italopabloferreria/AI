import { createHash, randomBytes } from 'node:crypto';

// Geração de token criptográfico aleatório para retomada segura de sessão
export function generateResumeToken(): string {
  return randomBytes(32).toString('hex');
}

// Hash SHA-256 do token para armazenamento seguro no banco
export function hashResumeToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

export function verifyResumeToken(token: string, expectedHash: string): boolean {
  if (!token || !expectedHash) return false;
  const computedHash = hashResumeToken(token);
  return computedHash === expectedHash;
}

// Rate Limiting em memória (janela deslizante de 1 minuto)
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

// Validações e sanitizações
export function sanitizeString(val: unknown, maxLength = 255): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLength);
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim());
}
