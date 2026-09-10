# I Can’t Believe It’s AI — !AI DIGITAL CHECK

Aplicação web em português desenvolvida com React 19 + TypeScript, utilizando Vinext (Next.js App Router sobre Vite) com suporte a runtime server e opção de bundle estático SPA para deploy CDN.

---

## 1. Arquitetura do Sistema

```
[ Visitante / Cliente Web ]
          │
          ▼  (HTTPS / JSON / Bearer / x-resume-token)
┌─────────────────────────────────────────────────────────┐
│               App Router & API Endpoints                │
│  - POST /api/leads                                      │
│  - POST /api/digital-check                              │
│  - GET  /api/digital-check/:id                          │
│  - PATCH/POST /api/digital-check/:id/answers            │
│  - POST /api/digital-check/:id/complete                 │
└──────────────────────────┬──────────────────────────────┘
                           │  (Repository Singleton)
                           ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Storage Layer                   │
│  - Pool conservador (max: 5 conexões, timeouts)         │
│  - Queries estritamente parametrizadas ($1, $2, ...)    │
│  - Transações com Row-Level Locking (FOR UPDATE)        │
│  - Constraints: CHECKs de score, current_step, UNIQUEs  │
└──────────────────────────┬──────────────────────────────┘
                           │  (Futuro / Desacoplado)
                           ▼
          [ CRM & Webhook Notifier (Assíncrono) ]
```

---

## 2. Fluxo do !AI Digital Check

1. **Formulário Comercial (`#contato`)**:
   - Coleta nome, empresa, e-mail, WhatsApp (com DDD), site/Instagram (opcional) e o desafio atual.
   - Validação estrita de consentimento LGPD: aceita **apenas boolean literal `true`**. Valores como `"false"`, `"true"`, `1` ou `0` são rejeitados com HTTP 400.
   - Proteção anti-bot com honeypot acessível (`company_hp`) e rate limiting em janela deslizante.

2. **Criação do Lead (`POST /api/leads`)**:
   - Cria o lead em `leads` com status `created`, normalizando e-mail (`trim().toLowerCase()`) e telefone.
   - Retorna `{ leadId }`. Em caso de erro na etapa seguinte, o frontend mantém o `leadId` para evitar duplicatas em retentativas.

3. **Criação da Sessão (`POST /api/digital-check`)**:
   - Valida existência do `leadId` no banco.
   - Gera um `resumeToken` criptograficamente seguro (256 bits via `node:crypto`).
   - Calcula o hash SHA-256 e persiste **somente o hash** (`resume_token_hash`) no banco.
   - Retorna o token bruto exclusivamente ao navegador para armazenamento em `sessionStorage`. O hash nunca é exposto ao cliente.

4. **10 Etapas Canônicas (01 / 10 a 10 / 10)**:
   - Apresentação limpa com 1 pergunta focal por tela (sem blocos aninhados):
     - `01 / 10`: `lead_sources` (Aquisição de clientes)
     - `02 / 10`: `lead_handling` (Primeiro atendimento e triagem)
     - `03 / 10`: `lead_organization` (Gestão comercial - CRM, planilhas, WhatsApp ou memória)
     - `04 / 10`: `follow_up` (Acompanhamento e lembretes de clientes)
     - `05 / 10`: `manual_tasks` (Tarefas manuais repetitivas da equipe)
     - `06 / 10`: `system_integration` (Integração entre sistemas)
     - `07 / 10`: `website_function` (Papel do site no processo de vendas)
     - `08 / 10`: `ai_opportunity` (Onde automação/IA traria alívio)
     - `09 / 10`: `main_bottleneck` (Principal gargalo operacional em texto livre)
     - `10 / 10`: `urgency` (Nível de urgência na escala 1 a 5)

5. **Salvamento Progressivo e `current_step`**:
   - A cada resposta, o cliente envia `POST /api/digital-check/:id/answers` com o cabeçalho `x-resume-token`.
   - **Convenção de `current_step`**: representa a **próxima etapa que o usuário deve ver** (1 a 10).
   - O PostgreSQL é a fonte da verdade: ao recarregar a página (refresh) ou retomar a sessão, o frontend consulta `GET /api/digital-check/:id` e posiciona o usuário exatamente na etapa indicada pelo banco.

6. **Finalização Atômica e Idempotente (`POST /api/digital-check/:id/complete`)**:
   - Utiliza transação real PostgreSQL com `SELECT ... FOR UPDATE` (row lock).
   - Se a sessão já estiver com `status = 'completed'`, retorna imediatamente os dados existentes **sem recalcular, sem duplicar recomendações e sem alterar `completed_at`**.
   - Se pendente, executa a engine determinística, grava as recomendações (garantidas sem duplicatas via `UNIQUE (digital_check_id, recommendation_key)`), atualiza `status = 'completed'`, `score` e `primary_opportunity`, gravando `completed_at = NOW()` uma única vez.
   - Qualquer tentativa de `PATCH /answers` após a conclusão é bloqueada com HTTP 409 Conflict.

---

## 3. Banco de Dados PostgreSQL

### DDL do Schema
O arquivo [`db/schema.sql`](db/schema.sql) contém as definições completas:
- Extensão `pgcrypto` para geração de UUIDs padrão v4.
- Tabela `leads`: dados cadastrais do contato, consentimento e versão de política.
- Tabela `digital_checks`: controle da sessão, com índice UNIQUE para `resume_token_hash`, constraint `CHECK (current_step BETWEEN 1 AND 10)`, `CHECK (score IS NULL OR score BETWEEN 0 AND 100)` e `CHECK` para `primary_opportunity`.
- Tabela `digital_check_answers`: respostas com constraint `UNIQUE (digital_check_id, question_key)`.
- Tabela `digital_check_recommendations`: recomendações com `UNIQUE (digital_check_id, recommendation_key)`.

### Como Aplicar o Schema
```sh
# Via cliente psql
psql "$DATABASE_URL" -f db/schema.sql

# Ou executando o arquivo SQL no dashboard do seu provedor (Supabase, Neon, RDS, etc.)
```

---

## 4. Variáveis de Ambiente e Configuração

Crie um arquivo `.env` na raiz do projeto (nunca suba credenciais ao controle de versão):

```env
# URL de conexão com o PostgreSQL (OBRIGATÓRIO em produção)
DATABASE_URL=postgresql://usuario:senha@host:5432/nome_do_banco?sslmode=require

# Configuração de SSL do banco
# Opções: 'true' (padrão em nuvem), 'false' (desliga SSL em testes locais)
DATABASE_SSL=true

# Se o provedor usar certificado autoassinado (ex: RDS sem CA instalada), definir como 'false':
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# Webhook assíncrono para envio de leads qualificados (opcional)
CRM_WEBHOOK_URL=https://meucrm.com/api/webhook

# Chaves para envio de e-mails transacionais (opcional)
EMAIL_API_KEY=sua_chave_resend_ou_sendgrid
INTERNAL_ALERT_EMAIL=contato@icantbelieveitsai.com.br
```

### Regras Estritas de Ambiente
- **Produção (`NODE_ENV=production`)**: Se `DATABASE_URL` não estiver definida, a aplicação **falha explicitamente com HTTP 500**. Nunca existe fallback silencioso para memória em produção. A mensagem retornada ao visitante é genérica (*"Não conseguimos preparar seu Digital Check agora. Tente novamente em alguns instantes."*), sem expor detalhes internos ou nomes de variáveis.
- **Desenvolvimento e Testes Locais**: Se `DATABASE_URL` estiver ausente, o repositório em memória (`InMemoryRepository`) é utilizado automaticamente para agilizar o desenvolvimento sem depender de infraestrutura externa.

---

## 5. Como Testar e Executar

### 1. Testes Automatizados dos 22 Cenários
Executa a suíte de testes ponta a ponta validando todos os requisitos de segurança, idempotência, concorrência e constraints:
```sh
npx tsx scripts/test-scenarios.ts
```

### 2. Validação de Tipos (TypeScript)
```sh
npm run typecheck
```

### 3. Build do Servidor (Vinext SSR / API)
```sh
npm run build
```

### 4. Build SPA Estático (Vite)
```sh
npm run build:static
```

> **Atenção sobre o Build Estático**: O build SPA estático gera arquivos para CDNs estáticas (ex: Netlify, Vercel estático). Ele não inclui o backend Node/PostgreSQL por si só. Se executado sem a API configurada, o Digital Check detecta que o backend não está acessível e informa o usuário adequadamente, sem simular persistência falsa.

---

## 6. Como Estender o Diagnóstico

- **Novas Perguntas ou Opções**: Altere [`lib/digital-check/questions.ts`](lib/digital-check/questions.ts) e atualize as opções permitidas em [`lib/digital-check/validation.ts`](lib/digital-check/validation.ts).
- **Regras de Recomendação**: Edite [`lib/digital-check/engine.ts`](lib/digital-check/engine.ts). Cada recomendação deve possuir um `recommendationKey` único para manter a idempotência.
- **Integração com CRM**: Implemente a chamada para seu CRM em [`lib/services/crm.ts`](lib/services/crm.ts). O Digital Check despacha o payload de forma assíncrona após a transação de finalização.
- **Alertas por E-mail**: Implemente seu disparador em [`lib/services/email.ts`](lib/services/email.ts).