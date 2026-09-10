import { randomUUID } from 'node:crypto';
import pg from 'pg';
import type {
  AnswerValue,
  Category,
  DiagnosticResult,
  DigitalCheck,
  DigitalCheckAnswer,
  DigitalCheckRecommendation,
  Lead,
} from './types';

export interface IDigitalCheckRepository {
  createLead(data: {
    name: string;
    company: string;
    email: string;
    whatsapp: string;
    websiteOrInstagram?: string;
    initialProblem: string;
    consent: boolean;
    consentAt: string;
    privacyPolicyVersion: string;
    source?: string;
  }): Promise<Lead>;
  getLead(id: string): Promise<Lead | null>;
  createDigitalCheck(data: { leadId: string; resumeTokenHash: string }): Promise<DigitalCheck>;
  getDigitalCheck(id: string): Promise<DigitalCheck | null>;
  upsertAnswer(
    digitalCheckId: string,
    questionKey: string,
    answerJson: AnswerValue,
    nextStep?: number
  ): Promise<DigitalCheckAnswer>;
  getAnswers(digitalCheckId: string): Promise<DigitalCheckAnswer[]>;
  saveRecommendations(digitalCheckId: string, recommendations: DigitalCheckRecommendation[]): Promise<void>;
  getRecommendations(digitalCheckId: string): Promise<DigitalCheckRecommendation[]>;
  completeDigitalCheckAtomic(
    digitalCheckId: string,
    engineCalculator: (answers: DigitalCheckAnswer[]) => DiagnosticResult
  ): Promise<{
    check: DigitalCheck;
    recommendations: DigitalCheckRecommendation[];
    alreadyCompleted: boolean;
  }>;
}

// -------------------------------------------------------------
// CONFIGURAÇÃO DO POOL POSTGRESQL (ITEM 14 E ITEM 15)
// -------------------------------------------------------------
function createPostgresPool(connectionString: string): pg.Pool {
  let sslConfig: boolean | { rejectUnauthorized: boolean } | undefined;

  // Respeita flag explícita DATABASE_SSL
  if (process.env.DATABASE_SSL === 'false' || process.env.DATABASE_SSL === '0') {
    sslConfig = false;
  } else if (process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1') {
    const allowInsecure = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false';
    sslConfig = allowInsecure ? { rejectUnauthorized: false } : true;
  } else {
    // Detecção automática segura: desliga em localhost, ativa em provedores remotos
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    if (isLocalhost) {
      sslConfig = false;
    } else {
      // Provedores como Neon, Supabase, RDS requerem SSL. Se o certificado for autoassinado, DATABASE_SSL_REJECT_UNAUTHORIZED pode ser 'false'.
      const allowInsecure = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false';
      sslConfig = allowInsecure ? { rejectUnauthorized: false } : true;
    }
  }

  return new pg.Pool({
    connectionString,
    ssl: sslConfig,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// -------------------------------------------------------------
// POSTGRESQL REPOSITORY
// -------------------------------------------------------------
class PostgresRepository implements IDigitalCheckRepository {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = createPostgresPool(connectionString);
  }

  async createLead(data: {
    name: string;
    company: string;
    email: string;
    whatsapp: string;
    websiteOrInstagram?: string;
    initialProblem: string;
    consent: boolean;
    consentAt: string;
    privacyPolicyVersion: string;
    source?: string;
  }): Promise<Lead> {
    const query = `
      INSERT INTO leads (name, company, email, whatsapp, website_or_instagram, initial_problem, consent, consent_at, privacy_policy_version, source, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'created')
      RETURNING id, name, company, email, whatsapp, website_or_instagram as "websiteOrInstagram",
                initial_problem as "initialProblem", consent, consent_at as "consentAt",
                privacy_policy_version as "privacyPolicyVersion", source, status,
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await this.pool.query(query, [
      data.name,
      data.company,
      data.email,
      data.whatsapp,
      data.websiteOrInstagram || null,
      data.initialProblem,
      data.consent,
      data.consentAt,
      data.privacyPolicyVersion,
      data.source || 'website_hero_check',
    ]);
    return res.rows[0];
  }

  async getLead(id: string): Promise<Lead | null> {
    const query = `
      SELECT id, name, company, email, whatsapp, website_or_instagram as "websiteOrInstagram",
             initial_problem as "initialProblem", consent, consent_at as "consentAt",
             privacy_policy_version as "privacyPolicyVersion", source, status,
             created_at as "createdAt", updated_at as "updatedAt"
      FROM leads WHERE id = $1
    `;
    const res = await this.pool.query(query, [id]);
    return res.rows[0] || null;
  }

  async createDigitalCheck(data: { leadId: string; resumeTokenHash: string }): Promise<DigitalCheck> {
    const query = `
      INSERT INTO digital_checks (lead_id, resume_token_hash, status, current_step)
      VALUES ($1, $2, 'started', 1)
      RETURNING id, lead_id as "leadId", resume_token_hash as "resumeTokenHash",
                status, current_step as "currentStep", score, primary_opportunity as "primaryOpportunity",
                started_at as "startedAt", completed_at as "completedAt",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await this.pool.query(query, [data.leadId, data.resumeTokenHash]);
    return res.rows[0];
  }

  async getDigitalCheck(id: string): Promise<DigitalCheck | null> {
    const query = `
      SELECT id, lead_id as "leadId", resume_token_hash as "resumeTokenHash",
             status, current_step as "currentStep", score, primary_opportunity as "primaryOpportunity",
             started_at as "startedAt", completed_at as "completedAt",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM digital_checks WHERE id = $1
    `;
    const res = await this.pool.query(query, [id]);
    return res.rows[0] || null;
  }

  async upsertAnswer(
    digitalCheckId: string,
    questionKey: string,
    answerJson: AnswerValue,
    nextStep?: number
  ): Promise<DigitalCheckAnswer> {
    // 1. Verifica se a sessão já está concluída para bloquear alterações
    const check = await this.getDigitalCheck(digitalCheckId);
    if (!check) {
      throw new Error('Sessão de Digital Check não encontrada.');
    }
    if (check.status === 'completed') {
      const err = new Error('Não é possível alterar respostas de um Digital Check já concluído.');
      (err as any).statusCode = 409;
      throw err;
    }

    // 2. Upsert idempotente na tabela digital_check_answers
    const query = `
      INSERT INTO digital_check_answers (digital_check_id, question_key, answer_json)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (digital_check_id, question_key)
      DO UPDATE SET answer_json = EXCLUDED.answer_json, updated_at = NOW()
      RETURNING id, digital_check_id as "digitalCheckId", question_key as "questionKey",
                answer_json as "answerJson", created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await this.pool.query(query, [digitalCheckId, questionKey, JSON.stringify(answerJson)]);

    // 3. Atualiza current_step e status da sessão (ITEM 2)
    // Convenção: current_step = próxima etapa que o usuário deve ver (1 a 10)
    let stepToSet = check.currentStep;
    if (typeof nextStep === 'number' && nextStep >= 1 && nextStep <= 10) {
      stepToSet = Math.max(stepToSet, nextStep);
    }

    await this.pool.query(
      `UPDATE digital_checks
       SET status = 'in_progress', current_step = $2, updated_at = NOW()
       WHERE id = $1 AND status != 'completed'`,
      [digitalCheckId, stepToSet]
    );

    return res.rows[0];
  }

  async getAnswers(digitalCheckId: string): Promise<DigitalCheckAnswer[]> {
    const query = `
      SELECT id, digital_check_id as "digitalCheckId", question_key as "questionKey",
             answer_json as "answerJson", created_at as "createdAt", updated_at as "updatedAt"
      FROM digital_check_answers WHERE digital_check_id = $1
      ORDER BY created_at ASC
    `;
    const res = await this.pool.query(query, [digitalCheckId]);
    return res.rows;
  }

  async saveRecommendations(digitalCheckId: string, recommendations: DigitalCheckRecommendation[]): Promise<void> {
    for (const r of recommendations) {
      const recKey = r.recommendationKey || r.title.toLowerCase().replace(/\s+/g, '_');
      await this.pool.query(
        `INSERT INTO digital_check_recommendations 
          (digital_check_id, recommendation_key, category, priority, title, description, reason, reason_keys)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         ON CONFLICT (digital_check_id, recommendation_key) DO NOTHING`,
        [digitalCheckId, recKey, r.category, r.priority, r.title, r.description, r.reason, JSON.stringify(r.reasonKeys || [])]
      );
    }
  }

  async getRecommendations(digitalCheckId: string): Promise<DigitalCheckRecommendation[]> {
    const query = `
      SELECT id, digital_check_id as "digitalCheckId", recommendation_key as "recommendationKey",
             category, priority, title, description, reason, reason_keys as "reasonKeys",
             created_at as "createdAt"
      FROM digital_check_recommendations WHERE digital_check_id = $1
      ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC
    `;
    const res = await this.pool.query(query, [digitalCheckId]);
    return res.rows;
  }

  // Finalização Atômica e Idempotente com Transação Real e Row Lock (ITEM 10)
  async completeDigitalCheckAtomic(
    digitalCheckId: string,
    engineCalculator: (answers: DigitalCheckAnswer[]) => DiagnosticResult
  ): Promise<{
    check: DigitalCheck;
    recommendations: DigitalCheckRecommendation[];
    alreadyCompleted: boolean;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Row-level lock para serializar requisições simultâneas
      const checkRes = await client.query(
        `SELECT id, lead_id as "leadId", resume_token_hash as "resumeTokenHash",
                status, current_step as "currentStep", score, primary_opportunity as "primaryOpportunity",
                started_at as "startedAt", completed_at as "completedAt",
                created_at as "createdAt", updated_at as "updatedAt"
         FROM digital_checks
         WHERE id = $1
         FOR UPDATE`,
        [digitalCheckId]
      );
      const check = checkRes.rows[0] as DigitalCheck | undefined;
      if (!check) {
        await client.query('ROLLBACK');
        throw new Error('Sessão de Digital Check não encontrada.');
      }

      // Se já concluído: retorna dados originais sem recalcular nem modificar completed_at (ITEM 12)
      if (check.status === 'completed') {
        const recsRes = await client.query(
          `SELECT id, digital_check_id as "digitalCheckId", recommendation_key as "recommendationKey",
                  category, priority, title, description, reason, reason_keys as "reasonKeys",
                  created_at as "createdAt"
           FROM digital_check_recommendations
           WHERE digital_check_id = $1
           ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC`,
          [digitalCheckId]
        );
        await client.query('COMMIT');
        return {
          check,
          recommendations: recsRes.rows,
          alreadyCompleted: true,
        };
      }

      // Buscar respostas da sessão
      const answersRes = await client.query(
        `SELECT id, digital_check_id as "digitalCheckId", question_key as "questionKey",
                answer_json as "answerJson", created_at as "createdAt", updated_at as "updatedAt"
         FROM digital_check_answers
         WHERE digital_check_id = $1
         ORDER BY created_at ASC`,
        [digitalCheckId]
      );
      const answers = answersRes.rows as DigitalCheckAnswer[];

      // Executar a engine determinística
      const diagnostic = engineCalculator(answers);

      // Inserir recomendações (com constraint UNIQUE por recommendation_key para nunca duplicar)
      for (const r of diagnostic.recommendations) {
        const recKey = r.recommendationKey || r.title.toLowerCase().replace(/\s+/g, '_');
        await client.query(
          `INSERT INTO digital_check_recommendations 
            (digital_check_id, recommendation_key, category, priority, title, description, reason, reason_keys)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
           ON CONFLICT (digital_check_id, recommendation_key) DO NOTHING`,
          [digitalCheckId, recKey, r.category, r.priority, r.title, r.description, r.reason, JSON.stringify(r.reasonKeys || [])]
        );
      }

      // Atualizar status para completed com completed_at imutável e updated_at
      const updatedRes = await client.query(
        `UPDATE digital_checks
         SET status = 'completed', score = $2, primary_opportunity = $3, completed_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING id, lead_id as "leadId", resume_token_hash as "resumeTokenHash",
                   status, current_step as "currentStep", score, primary_opportunity as "primaryOpportunity",
                   started_at as "startedAt", completed_at as "completedAt",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        [digitalCheckId, diagnostic.score, diagnostic.primaryOpportunity]
      );

      const recsRes = await client.query(
        `SELECT id, digital_check_id as "digitalCheckId", recommendation_key as "recommendationKey",
                category, priority, title, description, reason, reason_keys as "reasonKeys",
                created_at as "createdAt"
         FROM digital_check_recommendations
         WHERE digital_check_id = $1
         ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC`,
        [digitalCheckId]
      );

      await client.query('COMMIT');
      return {
        check: updatedRes.rows[0],
        recommendations: recsRes.rows,
        alreadyCompleted: false,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

// -------------------------------------------------------------
// IN-MEMORY REPOSITORY (DESENVOLVIMENTO / TESTES LOCAIS APENAS)
// NOTA: NUNCA USADO EM PRODUÇÃO. Se NODE_ENV === 'production' e DATABASE_URL ausente,
// a factory lança erro e a API retorna HTTP 500 sem revelar detalhes de infra.
// -------------------------------------------------------------
interface GlobalStorageState {
  leads: Map<string, Lead>;
  checks: Map<string, DigitalCheck>;
  answers: Map<string, DigitalCheckAnswer>;
  recommendations: Map<string, DigitalCheckRecommendation[]>;
  repo?: IDigitalCheckRepository;
}

const g = globalThis as unknown as { __AI_GLOBAL_STORAGE__?: GlobalStorageState };
if (!g.__AI_GLOBAL_STORAGE__) {
  g.__AI_GLOBAL_STORAGE__ = {
    leads: new Map(),
    checks: new Map(),
    answers: new Map(),
    recommendations: new Map(),
  };
}

class InMemoryRepository implements IDigitalCheckRepository {
  private get leads() {
    return g.__AI_GLOBAL_STORAGE__!.leads;
  }
  private get checks() {
    return g.__AI_GLOBAL_STORAGE__!.checks;
  }
  private get answers() {
    return g.__AI_GLOBAL_STORAGE__!.answers;
  }
  private get recommendations() {
    return g.__AI_GLOBAL_STORAGE__!.recommendations;
  }

  async createLead(data: {
    name: string;
    company: string;
    email: string;
    whatsapp: string;
    websiteOrInstagram?: string;
    initialProblem: string;
    consent: boolean;
    consentAt: string;
    privacyPolicyVersion: string;
    source?: string;
  }): Promise<Lead> {
    const now = new Date().toISOString();
    const lead: Lead = {
      id: randomUUID(),
      ...data,
      source: data.source || 'website_hero_check',
      status: 'created',
      createdAt: now,
      updatedAt: now,
    };
    this.leads.set(lead.id, lead);
    return lead;
  }

  async getLead(id: string): Promise<Lead | null> {
    return this.leads.get(id) || null;
  }

  async createDigitalCheck(data: { leadId: string; resumeTokenHash: string }): Promise<DigitalCheck> {
    const now = new Date().toISOString();
    const check: DigitalCheck = {
      id: randomUUID(),
      leadId: data.leadId,
      resumeTokenHash: data.resumeTokenHash,
      status: 'started',
      currentStep: 1,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.checks.set(check.id, check);
    return check;
  }

  async getDigitalCheck(id: string): Promise<DigitalCheck | null> {
    return this.checks.get(id) || null;
  }

  async upsertAnswer(
    digitalCheckId: string,
    questionKey: string,
    answerJson: AnswerValue,
    nextStep?: number
  ): Promise<DigitalCheckAnswer> {
    const check = this.checks.get(digitalCheckId);
    if (!check) throw new Error('Digital check not found');

    if (check.status === 'completed') {
      const err = new Error('Não é possível alterar respostas de um Digital Check já concluído.');
      (err as any).statusCode = 409;
      throw err;
    }

    const key = `${digitalCheckId}:${questionKey}`;
    const now = new Date().toISOString();
    const existing = this.answers.get(key);

    const answer: DigitalCheckAnswer = {
      id: existing?.id || randomUUID(),
      digitalCheckId,
      questionKey,
      answerJson,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.answers.set(key, answer);

    check.status = 'in_progress';
    if (typeof nextStep === 'number' && nextStep >= 1 && nextStep <= 10) {
      check.currentStep = Math.max(check.currentStep, nextStep);
    }
    check.updatedAt = now;

    return answer;
  }

  async getAnswers(digitalCheckId: string): Promise<DigitalCheckAnswer[]> {
    const prefix = `${digitalCheckId}:`;
    const list: DigitalCheckAnswer[] = [];
    for (const [k, v] of this.answers.entries()) {
      if (k.startsWith(prefix)) list.push(v);
    }
    return list;
  }

  async saveRecommendations(digitalCheckId: string, recs: DigitalCheckRecommendation[]): Promise<void> {
    const existing = this.recommendations.get(digitalCheckId) || [];
    const now = new Date().toISOString();
    const map = new Map(existing.map((r) => [r.recommendationKey, r]));

    for (const r of recs) {
      const recKey = r.recommendationKey || r.title.toLowerCase().replace(/\s+/g, '_');
      if (!map.has(recKey)) {
        map.set(recKey, {
          ...r,
          id: r.id || randomUUID(),
          digitalCheckId,
          recommendationKey: recKey,
          createdAt: now,
        });
      }
    }
    this.recommendations.set(digitalCheckId, Array.from(map.values()));
  }

  async getRecommendations(digitalCheckId: string): Promise<DigitalCheckRecommendation[]> {
    return this.recommendations.get(digitalCheckId) || [];
  }

  async completeDigitalCheckAtomic(
    digitalCheckId: string,
    engineCalculator: (answers: DigitalCheckAnswer[]) => DiagnosticResult
  ): Promise<{
    check: DigitalCheck;
    recommendations: DigitalCheckRecommendation[];
    alreadyCompleted: boolean;
  }> {
    const check = this.checks.get(digitalCheckId);
    if (!check) throw new Error('Digital check not found');

    // Idempotência: se já concluído, retorna existente sem alterar completed_at
    if (check.status === 'completed') {
      const recs = this.recommendations.get(digitalCheckId) || [];
      return {
        check,
        recommendations: recs,
        alreadyCompleted: true,
      };
    }

    const answers = await this.getAnswers(digitalCheckId);
    const diagnostic = engineCalculator(answers);

    await this.saveRecommendations(digitalCheckId, diagnostic.recommendations);
    const now = new Date().toISOString();
    check.status = 'completed';
    check.score = diagnostic.score;
    check.primaryOpportunity = diagnostic.primaryOpportunity;
    check.completedAt = now;
    check.updatedAt = now;

    return {
      check,
      recommendations: this.recommendations.get(digitalCheckId) || [],
      alreadyCompleted: false,
    };
  }
}

// -------------------------------------------------------------
// FACTORY & SINGLETON
// -------------------------------------------------------------
export function getRepository(): IDigitalCheckRepository {
  const dbUrl = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  // Regra Estrita (ITEM 16 E ITEM 17): em produção, NUNCA fallback silencioso para memória.
  if (isProduction && !dbUrl) {
    // Log interno
    // eslint-disable-next-line no-console
    console.error('[Digital Check] DATABASE_URL missing');
    throw new Error('DATABASE_URL_MISSING');
  }

  if (g.__AI_GLOBAL_STORAGE__?.repo) return g.__AI_GLOBAL_STORAGE__.repo;

  if (dbUrl) {
    const repo = new PostgresRepository(dbUrl);
    g.__AI_GLOBAL_STORAGE__!.repo = repo;
    return repo;
  }

  // Regra Estrita (ITEM 16 E ITEM 17): em produção, NUNCA fallback silencioso para memória.
  if (isProduction) {
    // Log interno
    // eslint-disable-next-line no-console
    console.error('[Digital Check] DATABASE_URL missing');
    throw new Error('DATABASE_URL_MISSING');
  }

  // Apenas em desenvolvimento / testes locais
  const repo = new InMemoryRepository();
  g.__AI_GLOBAL_STORAGE__!.repo = repo;
  return repo;
}
