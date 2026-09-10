import http from 'node:http';
import bridge from '../api/_bridge.js';

const PORT = 4322;

const server = http.createServer((req, res) => {
  bridge(req, res).catch((err) => {
    console.error('Test server error:', err);
    res.statusCode = 500;
    res.end(err.message);
  });
});

async function runTests() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`\n=== INICIANDO SMOKE TEST DE ROUTING NA PORTA ${PORT} ===\n`);

  try {
    // 1. Test POST /api/leads
    console.log('1. Testando POST /api/leads (via rewrite __route)...');
    const leadRes = await fetch(`http://127.0.0.1:${PORT}/api/_bridge?__route=/api/leads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test User',
        company: 'Routing Test Co',
        email: 'smoke@routing.com',
        whatsapp: '11988887777',
        initialProblem: 'Validando o roteamento dinâmico do Digital Check.',
        consent: true,
      }),
    });
    console.log(`   Status: ${leadRes.status} (esperado 201)`);
    const leadData = await leadRes.json();
    console.log(`   Body:`, leadData);
    if (leadRes.status !== 201 || !leadData.leadId) {
      throw new Error(`Falha no POST /api/leads: ${JSON.stringify(leadData)}`);
    }

    // 2. Test POST /api/digital-check
    console.log('\n2. Testando POST /api/digital-check (via rewrite __route)...');
    const checkRes = await fetch(`http://127.0.0.1:${PORT}/api/_bridge?__route=/api/digital-check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        leadId: leadData.leadId,
      }),
    });
    console.log(`   Status: ${checkRes.status} (esperado 201)`);
    const checkData = await checkRes.json();
    console.log(`   Body:`, { id: checkData.digitalCheckId, hasToken: !!checkData.resumeToken });
    if (checkRes.status !== 201 || !checkData.digitalCheckId || !checkData.resumeToken) {
      throw new Error(`Falha no POST /api/digital-check: ${JSON.stringify(checkData)}`);
    }

    const checkId = checkData.digitalCheckId;
    const resumeToken = checkData.resumeToken;

    // 3. Test GET /api/digital-check/:id
    console.log(`\n3. Testando GET /api/digital-check/${checkId} (via rewrite __route)...`);
    const getRes = await fetch(`http://127.0.0.1:${PORT}/api/_bridge?__route=/api/digital-check/${checkId}`, {
      method: 'GET',
      headers: {
        'x-resume-token': resumeToken,
      },
    });
    console.log(`   Status: ${getRes.status} (esperado 200)`);
    const getData = await getRes.json();
    console.log(`   Retorno: status=${getData.digitalCheck?.status}, currentStep=${getData.digitalCheck?.currentStep}`);
    if (getRes.status !== 200 || getData.digitalCheck?.id !== checkId) {
      throw new Error(`Falha no GET /api/digital-check/:id: ${JSON.stringify(getData)}`);
    }

    // 4. Test PATCH /api/digital-check/:id/answers
    console.log(`\n4. Testando PATCH /api/digital-check/${checkId}/answers (via rewrite __route)...`);
    const patchRes = await fetch(`http://127.0.0.1:${PORT}/api/_bridge?__route=/api/digital-check/${checkId}/answers`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-resume-token': resumeToken,
      },
      body: JSON.stringify({
        questionKey: 'lead_sources',
        answerJson: ['whatsapp', 'google'],
        nextStep: 2,
      }),
    });
    console.log(`   Status: ${patchRes.status} (esperado 200)`);
    const patchData = await patchRes.json();
    console.log(`   Body:`, patchData);
    if (patchRes.status !== 200 || !patchData.success) {
      throw new Error(`Falha no PATCH /api/digital-check/:id/answers: ${JSON.stringify(patchData)}`);
    }

    // 5. Test POST /api/digital-check/:id/complete (verificação de que o endpoint é alcançado)
    console.log(`\n5. Testando POST /api/digital-check/${checkId}/complete (sem answers completos para verificar routing)...`);
    const completeRes = await fetch(`http://127.0.0.1:${PORT}/api/_bridge?__route=/api/digital-check/${checkId}/complete`, {
      method: 'POST',
      headers: {
        'x-resume-token': resumeToken,
      },
    });
    console.log(`   Status: ${completeRes.status} (≠ 404 de infraestrutura, status ${completeRes.status} do handler)`);
    const completeData = await completeRes.json();
    console.log(`   Body retornado pelo handler:`, completeData);
    if (completeRes.status === 404 && !completeData.error) {
      throw new Error(`404 de infraestrutura recebido em complete!`);
    }

    console.log('\n=== TODOS OS TESTES DE ROUTING PASSARAM COM SUCESSO! ===\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('\n❌ ERRO NO SMOKE TEST:', err);
  process.exit(1);
});
