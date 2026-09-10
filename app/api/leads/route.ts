import { NextResponse } from 'next/server';
import { checkRateLimit, isValidEmail, sanitizeString } from '@/lib/digital-check/security';
import { getRepository } from '@/lib/digital-check/storage';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
    if (!checkRateLimit(ip, 15)) {
      return NextResponse.json(
        { error: 'Muitas solicitações. Aguarde um instante e tente novamente.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as Record<string, any>;

    // 1. Proteção Honeypot
    if (body.company_hp) {
      // Rejeita submissões preenchidas por robôs
      return NextResponse.json({ error: 'Submissão inválida.' }, { status: 400 });
    }

    // 2. Sanitização e validação dos campos obrigatórios
    const name = sanitizeString(body.name, 120);
    const company = sanitizeString(body.company, 160);
    const email = sanitizeString(body.email, 254).toLowerCase();
    const websiteOrInstagram = sanitizeString(body.website || body.websiteOrInstagram, 250);
    const initialProblem = sanitizeString(body.message || body.initialProblem, 2500);
    const consent = Boolean(body.consent);

    if (name.length < 2) {
      return NextResponse.json({ error: 'Por favor, informe seu nome.' }, { status: 400 });
    }
    if (company.length < 2) {
      return NextResponse.json({ error: 'Por favor, informe o nome da sua empresa.' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Informe um endereço de e-mail válido.' }, { status: 400 });
    }
    if (initialProblem.length < 10) {
      return NextResponse.json(
        { error: 'Descreva seu desafio atual com pelo menos 10 caracteres.' },
        { status: 400 }
      );
    }
    if (!consent) {
      return NextResponse.json(
        { error: 'É necessário autorizar o contato para prosseguir com o Digital Check.' },
        { status: 400 }
      );
    }

    const storage = getRepository();
    const now = new Date().toISOString();

    const lead = await storage.createLead({
      name,
      company,
      email,
      websiteOrInstagram: websiteOrInstagram || undefined,
      initialProblem,
      consent: true,
      consentAt: now,
      privacyPolicyVersion: '2026.1',
    });

    return NextResponse.json({ leadId: lead.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno ao salvar lead';
    // eslint-disable-next-line no-console
    console.error('[POST /api/leads error]:', err);
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL ? message : 'Não conseguimos salvar seu Digital Check. Tente novamente.' },
      { status: 500 }
    );
  }
}
