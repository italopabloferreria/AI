import { randomUUID } from 'node:crypto';
import pg from 'pg';
import type {
  AnswerValue,
  Category,
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
    websiteOrInstagram?: string;
    initialProblem: string;
    consent: boolean;
    consentAt: string;
    privacyPolicyVersion: string;
  }): Promise<Lead>;
  getLead(id: string): Promise<Lead | null>;
  createDigitalCheck(data: { leadId: string; resumeTokenHash: string }): Promise<DigitalCheck>;
  getDigitalCheck(id: string): Promise<DigitalCheck | null>;
  upsertAnswer(digitalCheckId: string, questionKey: string, answerJson: AnswerValue): Promise<DigitalCheckAnswer>;
  getAnswers(digitalCheckId: string): Promise<DigitalCheckAnswer[]>;
  saveRecommendations(digitalCheckId: string, recommendations: DigitalCheckRecommendation[]): Promise<void>;
  getRecommendations(digitalCheckId: string): Promise<DigitalCheckRecommendation[]>;
  completeDigitalCheck(digitalCheckId: string, score: number, primaryOpportunity: Category): Promise<DigitalCheck>;
}

// -------------------------------------------------------------
// POSTGRESQL REPOSITORY
// -------------------------------------------------------------
class PostgresRepository implements IDigitalCheckRepository {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
  }

  async createLead(data: {
    name: string;
    company: string;
    email: string;
    websiteOrInstagram?: string;
    initialProblem: string;
    consent: boolean;
    consentAt: string;
    privacyPolicyVersion: string;
  }): Promise<Lead> {
    const query = `
      INSERT INTO leads (name, company, email, website_or_instagram, initial_problem, consent, consent_at, privacy_policy_version, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'created')
      RETURNING id, name, company, email, website_or_instagram as "websiteOrInstagram",
                initial_problem as "initialProblem", consent, consent_at as "consentAt",
                privacy_policy_version as "privacyPolicyVersion", source, status,
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await this.pool.query(query, [
      data.name,
      data.company,
      data.email,
      data.websiteOrInstagram || null,
      data.initialProblem,
      data.consent,
      data.consentAt,
      data.privacyPolicyVersion,
    ]);
    return res.rows[0];
  }

  async getLead(id: string): Promise<Lead | null> {
    const query = `
      SELECT id, name, company, email, website_or_instagram as "websiteOrInstagram",
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

  async upsertAnswer(digitalCheckId: string, questionKey: string, answerJson: AnswerValue): Promise<DigitalCheckAnswer> {
    const query = `
      INSERT INTO digital_check_answers (digital_check_id, question_key, answer_json)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (digital_check_id, question_key)
      DO UPDATE SET answer_json = EXCLUDED.answer_json, updated_at = NOW()
      RETURNING id, digital_check_id as "digitalCheckId", question_key as "questionKey",
                answer_json as "answerJson", created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await this.pool.query(query, [digitalCheckId, questionKey, JSON.stringify(answerJson)]);

    // Atualiza status da sessão para in_progress se estiver started
    await this.pool.query(
      `UPDATE digital_checks SET status = 'in_progress', updated_at = NOW() WHERE id = $1 AND status = 'started'`,
      [digitalCheckId]
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
    // Evita duplicatas se já existirem recomendações para este check
    const existing = await this.getRecommendations(digitalCheckId);
    if (existing.length > 0) return;

    for (const r of recommendations) {
      await this.pool.query(
        `INSERT INTO digital_check_recommendations (digital_check_id, category, priority, title, description, reason, reason_keys)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [digitalCheckId, r.category, r.priority, r.title, r.description, r.reason, JSON.stringify(r.reasonKeys)]
      );
    }
  }

  async getRecommendations(digitalCheckId: string): Promise<DigitalCheckRecommendation[]> {
    const query = `
      SELECT id, digital_check_id as "digitalCheckId", category, priority,
             title, description, reason, reason_keys as "reasonKeys", created_at as "createdAt"
      FROM digital_check_recommendations WHERE digital_check_id = $1
      ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC
    `;
    const res = await this.pool.query(query, [digitalCheckId]);
    return res.rows;
  }

  async completeDigitalCheck(digitalCheckId: string, score: number, primaryOpportunity: Category): Promise<DigitalCheck> {
    const query = `
      UPDATE digital_checks
      SET status = 'completed', score = $2, primary_opportunity = $3, completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING id, lead_id as "leadId", resume_token_hash as "resumeTokenHash",
                status, current_step as "currentStep", score, primary_opportunity as "primaryOpportunity",
                started_at as "startedAt", completed_at as "completedAt",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const res = await this.pool.query(query, [digitalCheckId, score, primaryOpportunity]);
    return res.rows[0];
  }
}

// -------------------------------------------------------------
// IN-MEMORY REPOSITORY (DESENVOLVIMENTO / TESTES LOCAIS APENAS)
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
    websiteOrInstagram?: string;
    initialProblem: string;
    consent: boolean;
    consentAt: string;
    privacyPolicyVersion: string;
  }): Promise<Lead> {
    const now = new Date().toISOString();
    const lead: Lead = {
      id: randomUUID(),
      ...data,
      source: 'website_hero_check',
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

  async upsertAnswer(digitalCheckId: string, questionKey: string, answerJson: AnswerValue): Promise<DigitalCheckAnswer> {
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

    const check = this.checks.get(digitalCheckId);
    if (check && check.status === 'started') {
      check.status = 'in_progress';
      check.updatedAt = now;
    }

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
    if (this.recommendations.has(digitalCheckId)) return; // Idempotente
    const now = new Date().toISOString();
    const formatted = recs.map((r) => ({
      ...r,
      id: r.id || randomUUID(),
      digitalCheckId,
      createdAt: now,
    }));
    this.recommendations.set(digitalCheckId, formatted);
  }

  async getRecommendations(digitalCheckId: string): Promise<DigitalCheckRecommendation[]> {
    return this.recommendations.get(digitalCheckId) || [];
  }

  async completeDigitalCheck(digitalCheckId: string, score: number, primaryOpportunity: Category): Promise<DigitalCheck> {
    const check = this.checks.get(digitalCheckId);
    if (!check) throw new Error('Digital check not found');
    const now = new Date().toISOString();
    check.status = 'completed';
    check.score = score;
    check.primaryOpportunity = primaryOpportunity;
    check.completedAt = now;
    check.updatedAt = now;
    return check;
  }
}

// -------------------------------------------------------------
// FACTORY & SINGLETON
// -------------------------------------------------------------
export function getRepository(): IDigitalCheckRepository {
  if (g.__AI_GLOBAL_STORAGE__?.repo) return g.__AI_GLOBAL_STORAGE__.repo;

  const dbUrl = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (dbUrl) {
    const repo = new PostgresRepository(dbUrl);
    g.__AI_GLOBAL_STORAGE__!.repo = repo;
    return repo;
  }

  // Regra Estrita: em produção, falhar explicitamente caso não haja DATABASE_URL
  if (isProduction) {
    throw new Error(
      'Configuração ausente: DATABASE_URL é obrigatória em ambiente de produção para persistência do Digital Check.'
    );
  }

  // Apenas em desenvolvimento / testes locais
  const repo = new InMemoryRepository();
  g.__AI_GLOBAL_STORAGE__!.repo = repo;
  return repo;
}
