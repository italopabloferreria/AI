import { isValidEmail, normalizePhone, sanitizeString } from './security';
import type { AnswerValue, CanonicalQuestionKey } from './types';

// Constantes centrais de configuração
export const PRIVACY_POLICY_VERSION = '2026.1';
export const DEFAULT_LEAD_SOURCE = 'website_hero_check';

export const CANONICAL_QUESTION_KEYS: Set<CanonicalQuestionKey> = new Set([
  'lead_sources',
  'lead_handling',
  'lead_organization',
  'follow_up',
  'manual_tasks',
  'system_integration',
  'website_function',
  'ai_opportunity',
  'main_bottleneck',
  'urgency',
]);

// Opções permitidas por pergunta para validação rígida de integridade
const ALLOWED_OPTIONS: Record<CanonicalQuestionKey, Set<string>> = {
  lead_sources: new Set(['whatsapp', 'instagram', 'google', 'website', 'referral', 'paid_ads', 'outbound', 'other']),
  lead_handling: new Set(['manual_reply', 'goes_to_whatsapp', 'auto_crm', 'auto_reply', 'depends_available', 'no_process', 'other']),
  lead_organization: new Set(['crm', 'spreadsheet', 'whatsapp', 'memory', 'paper', 'no_place']),
  follow_up: new Set(['auto', 'crm_alert', 'manual_track', 'sometimes', 'no_follow_up']),
  manual_tasks: new Set(['copy_paste', 'register_leads', 'send_messages', 'follow_up_manual', 'scheduling', 'proposals', 'update_sheets', 'faq_reply', 'none', 'other']),
  system_integration: new Set(['most_integrated', 'some_integrated', 'mostly_manual', 'isolated_islands', 'unknown']),
  website_function: new Set(['no_website', 'presentation_only', 'lead_capture', 'online_booking', 'sends_to_crm']),
  ai_opportunity: new Set(['support', 'sales', 'reports', 'process_auto', 'no_idea']),
  main_bottleneck: new Set(), // Validado como texto livre de até 1000 chars
  urgency: new Set(['1', '2', '3', '4', '5']),
};

// -------------------------------------------------------------
// PARSER SEGURO DE BODY JSON (TRATA MALFORMED JSON E CONTENT-TYPE)
// -------------------------------------------------------------
export async function parseJsonBody(request: Request): Promise<
  | { success: true; data: unknown }
  | { success: false; response: Response }
> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType && !contentType.includes('application/json') && !contentType.includes('*/*')) {
    return {
      success: false,
      response: Response.json(
        { error: 'Cabeçalho Content-Type deve ser application/json.' },
        { status: 415 }
      ),
    };
  }

  try {
    const text = await request.text();
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        response: Response.json(
          { error: 'Não conseguimos interpretar os dados enviados.' },
          { status: 400 }
        ),
      };
    }
    // Limite de segurança para payload JSON (máx 100KB)
    if (text.length > 100 * 1024) {
      return {
        success: false,
        response: Response.json(
          { error: 'Payload excede o tamanho máximo permitido.' },
          { status: 413 }
        ),
      };
    }
    const data = JSON.parse(text);
    return { success: true, data };
  } catch {
    return {
      success: false,
      response: Response.json(
        { error: 'Não conseguimos interpretar os dados enviados.' },
        { status: 400 }
      ),
    };
  }
}

// -------------------------------------------------------------
// VALIDAÇÃO DE CRIAÇÃO DE LEAD (ITEM 1 E ITEM 18)
// -------------------------------------------------------------
export interface ValidatedLeadPayload {
  name: string;
  company: string;
  email: string;
  whatsapp: string;
  websiteOrInstagram?: string;
  initialProblem: string;
  consent: boolean;
  consentAt: string;
  privacyPolicyVersion: string;
  source: string;
}

export function validateCreateLeadPayload(
  body: unknown
): { valid: true; data: ValidatedLeadPayload } | { valid: false; error: string; status: number } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Corpo da requisição inválido.', status: 400 };
  }

  const b = body as Record<string, unknown>;

  // 1. Honeypot check
  if (b.company_hp) {
    return { valid: false, error: 'Submissão inválida.', status: 400 };
  }

  // 2. Validação ESTRITA de consentimento (ITEM 1)
  // Rejeita "true", "false", "1", etc. Somente boolean literal true.
  if (b.consent !== true) {
    return {
      valid: false,
      error: 'É necessário autorizar o contato para prosseguir com o Digital Check.',
      status: 400,
    };
  }

  // 3. Sanitização e validação de campos
  const name = sanitizeString(b.name, 120);
  const company = sanitizeString(b.company, 160);
  const rawEmail = sanitizeString(b.email, 254);
  const email = rawEmail.toLowerCase();
  const rawPhone = b.whatsapp || b.phone;
  const whatsapp = normalizePhone(rawPhone);
  const rawWebsite = b.website || b.websiteOrInstagram;
  const websiteOrInstagram = rawWebsite ? sanitizeString(rawWebsite, 250) : undefined;
  const rawProblem = b.message || b.initialProblem;
  const initialProblem = sanitizeString(rawProblem, 2500);

  if (name.length < 2) {
    return { valid: false, error: 'Por favor, informe seu nome (mínimo 2 caracteres).', status: 400 };
  }
  if (company.length < 2) {
    return { valid: false, error: 'Por favor, informe o nome da sua empresa (mínimo 2 caracteres).', status: 400 };
  }
  if (!isValidEmail(email)) {
    return { valid: false, error: 'Informe um endereço de e-mail válido.', status: 400 };
  }
  const cleanDigits = whatsapp.replace(/\D/g, '');
  if (cleanDigits.length < 10) {
    return { valid: false, error: 'Informe um número de WhatsApp válido com DDD (mínimo 10 dígitos).', status: 400 };
  }
  if (initialProblem.length < 10) {
    return { valid: false, error: 'Descreva seu desafio atual com pelo menos 10 caracteres.', status: 400 };
  }

  return {
    valid: true,
    data: {
      name,
      company,
      email,
      whatsapp,
      websiteOrInstagram,
      initialProblem,
      consent: true,
      consentAt: new Date().toISOString(),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      source: DEFAULT_LEAD_SOURCE,
    },
  };
}

// -------------------------------------------------------------
// VALIDAÇÃO DE RESPOSTA DO DIGITAL CHECK (ITEM 30 E ITEM 31)
// -------------------------------------------------------------
export interface ValidatedAnswerPayload {
  questionKey: CanonicalQuestionKey;
  answerJson: AnswerValue;
  nextStep?: number;
}

export function validateSaveAnswerPayload(
  body: unknown
): { valid: true; data: ValidatedAnswerPayload } | { valid: false; error: string; status: number } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Corpo da requisição inválido.', status: 400 };
  }

  const b = body as Record<string, unknown>;
  const questionKeyStr = typeof b.questionKey === 'string' ? b.questionKey.trim() : '';

  if (!CANONICAL_QUESTION_KEYS.has(questionKeyStr as CanonicalQuestionKey)) {
    return { valid: false, error: `Chave de pergunta inválida: '${questionKeyStr}'.`, status: 400 };
  }

  const questionKey = questionKeyStr as CanonicalQuestionKey;
  const answer = b.answerJson;

  if (answer === undefined || answer === null) {
    return { valid: false, error: 'Conteúdo da resposta é obrigatório.', status: 400 };
  }

  // Validação específica para cada questionKey
  switch (questionKey) {
    case 'lead_sources':
    case 'lead_handling':
    case 'manual_tasks':
    case 'ai_opportunity':
    case 'website_function': {
      if (!Array.isArray(answer)) {
        return { valid: false, error: `A resposta para '${questionKey}' deve ser uma lista de opções selecionadas.`, status: 400 };
      }
      if (answer.length === 0) {
        return { valid: false, error: `Selecione ao menos uma opção para '${questionKey}'.`, status: 400 };
      }
      const allowed = ALLOWED_OPTIONS[questionKey];
      for (const item of answer) {
        if (typeof item !== 'string') {
          return { valid: false, error: 'Formato de opção inválido.', status: 400 };
        }
        // Trata opção com sufixo outro (ex: outro:descrição)
        if (item.startsWith('outro:')) {
          const customText = item.slice(6).trim();
          if (customText.length > 300) {
            return { valid: false, error: 'Texto adicional de "Outro" excede o limite de 300 caracteres.', status: 400 };
          }
          continue;
        }
        if (!allowed.has(item)) {
          return { valid: false, error: `Opção desconhecida '${item}' para a pergunta '${questionKey}'.`, status: 400 };
        }
      }
      break;
    }

    case 'lead_organization':
    case 'follow_up':
    case 'system_integration': {
      if (typeof answer !== 'string') {
        return { valid: false, error: `A resposta para '${questionKey}' deve ser uma string com a opção selecionada.`, status: 400 };
      }
      const allowed = ALLOWED_OPTIONS[questionKey];
      if (!allowed.has(answer)) {
        return { valid: false, error: `Opção desconhecida '${answer}' para a pergunta '${questionKey}'.`, status: 400 };
      }
      break;
    }

    case 'main_bottleneck': {
      if (typeof answer !== 'string') {
        return { valid: false, error: 'A resposta para o gargalo principal deve ser um texto.', status: 400 };
      }
      const trimmed = answer.trim();
      if (trimmed.length < 5) {
        return { valid: false, error: 'Descreva seu gargalo principal com pelo menos 5 caracteres.', status: 400 };
      }
      if (trimmed.length > 1000) {
        return { valid: false, error: 'A descrição do gargalo não pode ultrapassar 1000 caracteres.', status: 400 };
      }
      break;
    }

    case 'urgency': {
      let numVal: number;
      if (typeof answer === 'number') {
        numVal = answer;
      } else if (typeof answer === 'string' && /^[1-5]$/.test(answer.trim())) {
        numVal = parseInt(answer.trim(), 10);
      } else {
        return { valid: false, error: 'A urgência deve ser um número entre 1 e 5.', status: 400 };
      }

      if (numVal < 1 || numVal > 5) {
        return { valid: false, error: 'A urgência deve ser um valor entre 1 e 5.', status: 400 };
      }
      break;
    }
  }

  let nextStep: number | undefined;
  if (typeof b.nextStep === 'number' && b.nextStep >= 1 && b.nextStep <= 10) {
    nextStep = Math.floor(b.nextStep);
  }

  return {
    valid: true,
    data: {
      questionKey,
      answerJson: answer,
      nextStep,
    },
  };
}
