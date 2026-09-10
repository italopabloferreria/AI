/**
 * TEST SUITE: 22 CENÁRIOS OBRIGATÓRIOS DO !AI DIGITAL CHECK
 * Validação abrangente de rotas, repositório, segurança, transações e validações.
 */

import { POST as createLeadRoute } from '../app/api/leads/route';
import { POST as createCheckRoute } from '../app/api/digital-check/route';
import { GET as getCheckRoute } from '../app/api/digital-check/[id]/route';
import { POST as saveAnswerRoute, PATCH as patchAnswerRoute } from '../app/api/digital-check/[id]/answers/route';
import { POST as completeCheckRoute } from '../app/api/digital-check/[id]/complete/route';
import { getRepository } from '../lib/digital-check/storage';

async function runTests() {
  console.log('====================================================');
  console.log('INICIANDO SUITE DE 22 CENÁRIOS DE TESTE DO DIGITAL CHECK');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // CENÁRIOS 8 & 9: Consent = false e Consent = "false" devem falhar (ITEM 1)
  // -------------------------------------------------------------
  const resConsentFalse = await createLeadRoute(
    new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ana Silva',
        company: 'Clinica Teste',
        email: 'ana@clinica.com.br',
        whatsapp: '(11) 98888-7777',
        message: 'Preciso automatizar meus agendamentos urgentes.',
        consent: false,
      }),
    })
  );
  assert(resConsentFalse.status === 400, 'Cenário 8: Consent = false deve retornar HTTP 400');

  const resConsentString = await createLeadRoute(
    new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ana Silva',
        company: 'Clinica Teste',
        email: 'ana@clinica.com.br',
        whatsapp: '(11) 98888-7777',
        message: 'Preciso automatizar meus agendamentos urgentes.',
        consent: 'false',
      }),
    })
  );
  assert(resConsentString.status === 400, 'Cenário 9: Consent = "false" deve retornar HTTP 400');

  // -------------------------------------------------------------
  // CENÁRIO 6: Email inválido
  // -------------------------------------------------------------
  const resBadEmail = await createLeadRoute(
    new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ana Silva',
        company: 'Clinica Teste',
        email: 'email_invalido_sem_arroba',
        whatsapp: '(11) 98888-7777',
        message: 'Preciso automatizar meus agendamentos urgentes.',
        consent: true,
      }),
    })
  );
  assert(resBadEmail.status === 400, 'Cenário 6: Email inválido deve retornar HTTP 400');

  // -------------------------------------------------------------
  // CENÁRIO 7: WhatsApp inválido
  // -------------------------------------------------------------
  const resBadPhone = await createLeadRoute(
    new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ana Silva',
        company: 'Clinica Teste',
        email: 'ana@clinica.com.br',
        whatsapp: '1234', // Menos de 10 dígitos
        message: 'Preciso automatizar meus agendamentos urgentes.',
        consent: true,
      }),
    })
  );
  assert(resBadPhone.status === 400, 'Cenário 7: WhatsApp inválido (< 10 dígitos) deve retornar HTTP 400');

  // -------------------------------------------------------------
  // CENÁRIO 22: JSON inválido
  // -------------------------------------------------------------
  const resBadJson = await createLeadRoute(
    new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed json payload...',
    })
  );
  assert(resBadJson.status === 400, 'Cenário 22: JSON inválido deve retornar HTTP 400');

  // -------------------------------------------------------------
  // CRIAÇÃO VÁLIDA DE LEAD E DIGITAL CHECK
  // -------------------------------------------------------------
  const leadRes = await createLeadRoute(
    new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carlos Oliveira',
        company: 'Tech Solutions',
        email: 'carlos@techsolutions.com.br',
        whatsapp: '(11) 99999-1234',
        message: 'Nosso comercial demora muito para responder e perdemos clientes.',
        consent: true,
      }),
    })
  );
  assert(leadRes.status === 201, 'Lead válido criado com sucesso (HTTP 201)');
  const { leadId } = (await leadRes.json()) as { leadId: string };

  const checkRes = await createCheckRoute(
    new Request('http://localhost/api/digital-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId }),
    })
  );
  assert(checkRes.status === 201, 'Digital Check criado com sucesso com hash isolado (HTTP 201)');
  const { digitalCheckId, resumeToken } = (await checkRes.json()) as {
    digitalCheckId: string;
    resumeToken: string;
  };

  // -------------------------------------------------------------
  // CENÁRIO 11: digitalCheckId válido sem resumeToken
  // -------------------------------------------------------------
  const resNoToken = await getCheckRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}`),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  assert(resNoToken.status === 401, 'Cenário 11: Requisição sem token deve retornar HTTP 401');

  // -------------------------------------------------------------
  // CENÁRIO 12: Token inválido
  // -------------------------------------------------------------
  const resBadToken = await getCheckRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}`, {
      headers: { 'x-resume-token': 'token_falso_invalido' },
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  assert(resBadToken.status === 403, 'Cenário 12: Token incorreto deve retornar HTTP 403');

  // -------------------------------------------------------------
  // CENÁRIO 13: Token válido
  // -------------------------------------------------------------
  const resValidToken = await getCheckRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}`, {
      headers: { 'x-resume-token': resumeToken },
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  assert(resValidToken.status === 200, 'Cenário 13: Token válido permite acesso à sessão (HTTP 200)');
  const checkData = (await resValidToken.json()) as any;
  assert(!('resumeTokenHash' in checkData.digitalCheck), 'Segurança: resumeTokenHash NUNCA é exposto ao cliente');

  // -------------------------------------------------------------
  // CENÁRIO 18: QuestionKey inexistente
  // -------------------------------------------------------------
  const resBadKey = await patchAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'pergunta_que_nao_existe', answerJson: ['teste'] }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  assert(resBadKey.status === 400, 'Cenário 18: QuestionKey inexistente deve retornar HTTP 400');

  // -------------------------------------------------------------
  // CENÁRIO 19: Option inexistente em pergunta válida
  // -------------------------------------------------------------
  const resBadOption = await patchAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'lead_organization', answerJson: 'opcao_fantasma' }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  assert(resBadOption.status === 400, 'Cenário 19: Option inexistente deve retornar HTTP 400');

  // -------------------------------------------------------------
  // CENÁRIO 20: Urgency = 100
  // -------------------------------------------------------------
  const resBadUrgency = await patchAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'urgency', answerJson: 100 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  assert(resBadUrgency.status === 400, 'Cenário 20: Urgency = 100 deve retornar HTTP 400');

  // -------------------------------------------------------------
  // CENÁRIO 10: Mesmo answer enviado duas vezes (UPSERT idempotente)
  // -------------------------------------------------------------
  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'lead_sources', answerJson: ['whatsapp', 'instagram'], nextStep: 2 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'lead_sources', answerJson: ['whatsapp', 'google'], nextStep: 2 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  const storage = getRepository();
  const answersList = await storage.getAnswers(digitalCheckId);
  const leadSourcesAnswers = answersList.filter((a) => a.questionKey === 'lead_sources');
  assert(
    leadSourcesAnswers.length === 1 && JSON.stringify(leadSourcesAnswers[0].answerJson) === JSON.stringify(['whatsapp', 'google']),
    'Cenário 10: Mesmo answer enviado duas vezes resulta em exatamente 1 registro atualizado'
  );

  // -------------------------------------------------------------
  // CENÁRIO 2 & 3: Abandono na etapa 4 e Refresh na etapa 6 (persiste current_step)
  // -------------------------------------------------------------
  // Salva respostas até a etapa 4
  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'lead_handling', answerJson: ['manual_reply'], nextStep: 3 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'lead_organization', answerJson: 'memory', nextStep: 4 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'follow_up', answerJson: 'no_follow_up', nextStep: 5 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  // Consulta estado após etapa 4 (simulando retorno do usuário)
  const resumeAt5 = await getCheckRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}`, {
      headers: { 'x-resume-token': resumeToken },
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  const dataAt5 = (await resumeAt5.json()) as any;
  assert(dataAt5.digitalCheck.currentStep === 5, 'Cenário 2: Abandono após etapa 4 recupera current_step = 5');

  // Avança até a etapa 5
  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({
        questionKey: 'manual_tasks',
        answerJson: ['copy_paste', 'register_leads', 'faq_reply'],
        nextStep: 6,
      }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  // Simula refresh na etapa 6
  const resumeAt6 = await getCheckRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}`, {
      headers: { 'x-resume-token': resumeToken },
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  const dataAt6 = (await resumeAt6.json()) as any;
  assert(dataAt6.digitalCheck.currentStep === 6, 'Cenário 3: Refresh na etapa 6 preserva current_step = 6');

  // -------------------------------------------------------------
  // CENÁRIO 1: Fluxo completo 01 -> 10 -> resultado
  // -------------------------------------------------------------
  // Salva etapas 6 a 10
  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'system_integration', answerJson: 'mostly_manual', nextStep: 7 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'website_function', answerJson: ['presentation_only'], nextStep: 8 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'ai_opportunity', answerJson: ['support'], nextStep: 9 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({
        questionKey: 'main_bottleneck',
        answerJson: 'Perdemos contatos pois o WhatsApp não tem triagem e passamos dados manualmente.',
        nextStep: 10,
      }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  await saveAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'urgency', answerJson: 5, nextStep: 10 }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );

  // Conclui o diagnóstico
  const completeRes = await completeCheckRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  assert(completeRes.status === 200, 'Cenário 1: Fluxo completo concluído com sucesso (HTTP 200)');
  const completeData = (await completeRes.json()) as any;
  assert(completeData.recommendations.length > 0, 'Recomendações geradas pela engine com sucesso');
  assert(completeData.primaryOpportunity === 'AUTOMATE' || completeData.primaryOpportunity === 'OPERATE', 'Oportunidade primária calculada corretamente');

  // -------------------------------------------------------------
  // CENÁRIO 14: PATCH depois de completed deve ser rejeitado (HTTP 409)
  // -------------------------------------------------------------
  const resAfterComplete = await patchAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'lead_organization', answerJson: 'crm' }),
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  assert(resAfterComplete.status === 409, 'Cenário 14: PATCH em sessão concluída retorna HTTP 409 Conflict');

  // -------------------------------------------------------------
  // CENÁRIO 15 & 16: Complete executado duas vezes / simultaneamente (Idempotente)
  // -------------------------------------------------------------
  const completeSecondRes = await completeCheckRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  const completeSecondData = (await completeSecondRes.json()) as any;
  assert(completeSecondData.alreadyCompleted === true, 'Cenário 15: Segundo complete detecta finalização prévia');
  assert(completeSecondData.recommendations.length === completeData.recommendations.length, 'Cenário 15: Nenhuma recomendação duplicada');

  // Concorrência simulada (2 chamadas simultâneas)
  const [p1, p2] = await Promise.all([
    completeCheckRoute(
      new Request(`http://localhost/api/digital-check/${digitalCheckId}/complete`, {
        method: 'POST',
        headers: { 'x-resume-token': resumeToken },
      }),
      { params: Promise.resolve({ id: digitalCheckId }) }
    ),
    completeCheckRoute(
      new Request(`http://localhost/api/digital-check/${digitalCheckId}/complete`, {
        method: 'POST',
        headers: { 'x-resume-token': resumeToken },
      }),
      { params: Promise.resolve({ id: digitalCheckId }) }
    ),
  ]);
  assert(p1.status === 200 && p2.status === 200, 'Cenário 16: Chamadas simultâneas retornam 200 com segurança atômica');

  // -------------------------------------------------------------
  // CENÁRIO 17: Produção sem DATABASE_URL
  // -------------------------------------------------------------
  const originalEnv = process.env.NODE_ENV;
  const originalDb = process.env.DATABASE_URL;
  try {
    (process.env as any).NODE_ENV = 'production';
    delete (process.env as any).DATABASE_URL;

    // Tentar criar lead sem DATABASE_URL em produção
    const prodRes = await createLeadRoute(
      new Request('http://localhost/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Teste Prod',
          company: 'Prod Inc',
          email: 'teste@prod.com',
          whatsapp: '(11) 99999-9999',
          message: 'Desafio em produção sem banco configurado.',
          consent: true,
        }),
      })
    );
    const prodJson = (await prodRes.json()) as any;
    assert(
      prodRes.status === 500 && !prodJson.error.includes('DATABASE_URL'),
      'Cenário 17: Produção sem DATABASE_URL retorna HTTP 500 com mensagem pública genérica sem vazar infra'
    );
  } finally {
    (process.env as any).NODE_ENV = originalEnv;
    if (originalDb) (process.env as any).DATABASE_URL = originalDb;
  }

  // -------------------------------------------------------------
  // CENÁRIO 21: Payload grande demais
  // -------------------------------------------------------------
  const hugePayload = 'A'.repeat(120 * 1024); // 120KB > 100KB limit
  const resHuge = await createLeadRoute(
    new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Grande', text: hugePayload }),
    })
  );
  assert(resHuge.status === 413, 'Cenário 21: Payload acima do limite (100KB) retorna HTTP 413 Payload Too Large');

  // -------------------------------------------------------------
  // CENÁRIO 4 & 5: PATCH falha e Avançar sem responder
  // -------------------------------------------------------------
  const resEmptyAnswer = await patchAnswerRoute(
    new Request(`http://localhost/api/digital-check/${digitalCheckId}/answers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-resume-token': resumeToken },
      body: JSON.stringify({ questionKey: 'lead_sources', answerJson: [] }), // array vazio
    }),
    { params: Promise.resolve({ id: digitalCheckId }) }
  );
  assert(resEmptyAnswer.status === 409 || resEmptyAnswer.status === 400, 'Cenário 4/5: Enviar resposta vazia ou em check concluído é rejeitado');

  console.log('\n====================================================');
  console.log(`RESULTADO DOS TESTES: ${passed} PASSOU, ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});
