-- ============================================================
-- !AI DIGITAL CHECK - DATABASE SCHEMA (PostgreSQL)
-- ============================================================

-- Habilita extensão pgcrypto / uuid se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA LEADS
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    company VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL,
    whatsapp VARCHAR(30) NOT NULL,
    website_or_instagram VARCHAR(250),
    initial_problem TEXT NOT NULL,
    consent BOOLEAN NOT NULL DEFAULT true,
    consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    privacy_policy_version VARCHAR(20) NOT NULL DEFAULT '2026.1',
    source VARCHAR(50) NOT NULL DEFAULT 'website_hero_check',
    status VARCHAR(30) NOT NULL DEFAULT 'created',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir coluna whatsapp em bancos existentes
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- 2. TABELA DIGITAL_CHECKS (SESSÃO DO DIAGNÓSTICO)
CREATE TABLE IF NOT EXISTS digital_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    resume_token_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed')),
    current_step INTEGER NOT NULL DEFAULT 1,
    score INTEGER,
    primary_opportunity VARCHAR(50),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_checks_lead_id ON digital_checks(lead_id);
CREATE INDEX IF NOT EXISTS idx_digital_checks_status ON digital_checks(status);
CREATE INDEX IF NOT EXISTS idx_digital_checks_created_at ON digital_checks(created_at);

-- 3. TABELA DIGITAL_CHECK_ANSWERS (RESPOSTAS PROGRESSIVAS)
CREATE TABLE IF NOT EXISTS digital_check_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digital_check_id UUID NOT NULL REFERENCES digital_checks(id) ON DELETE CASCADE,
    question_key VARCHAR(60) NOT NULL,
    answer_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_digital_check_answer UNIQUE (digital_check_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_digital_check_answers_check_id ON digital_check_answers(digital_check_id);

-- 4. TABELA DIGITAL_CHECK_RECOMMENDATIONS (RESULTADOS CALCULADOS)
CREATE TABLE IF NOT EXISTS digital_check_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digital_check_id UUID NOT NULL REFERENCES digital_checks(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('BUILD', 'AUTOMATE', 'INTELLIGENCE', 'OPERATE')),
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    reason TEXT NOT NULL,
    reason_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_check_recs_check_id ON digital_check_recommendations(digital_check_id);
