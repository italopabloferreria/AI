import type {
  Category,
  DiagnosticResult,
  DigitalCheckAnswer,
  DigitalCheckRecommendation,
  Priority,
} from './types';

export function runDiagnosticEngine(
  digitalCheckId: string,
  answers: DigitalCheckAnswer[]
): DiagnosticResult {
  const answerMap = new Map<string, unknown>();
  for (const a of answers) {
    answerMap.set(a.questionKey, a.answerJson);
  }

  const categoryScores: Record<Category, number> = {
    BUILD: 0,
    AUTOMATE: 0,
    INTELLIGENCE: 0,
    OPERATE: 0,
  };

  const recommendations: DigitalCheckRecommendation[] = [];

  const getArray = (key: string): string[] => {
    const val = answerMap.get(key);
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string' && val.length > 0) return [val];
    return [];
  };

  const getString = (key: string): string => {
    const val = answerMap.get(key);
    return typeof val === 'string' ? val : '';
  };

  const urgencyRaw = getString('urgency');
  const urgencyNum = parseInt(urgencyRaw, 10) || 3;

  const getPriority = (basePriority: Priority): Priority => {
    if (urgencyNum >= 4) return 'high';
    if (urgencyNum <= 2 && basePriority === 'high') return 'medium';
    return basePriority;
  };

  // 1. ORGANIZAÇÃO COMERCIAL (OPERATE)
  const leadOrg = getString('lead_organization');
  if (['whatsapp', 'spreadsheet', 'memory', 'paper', 'no_place', 'unknown'].includes(leadOrg)) {
    categoryScores.OPERATE += 35;
    const reasonKeys = [`lead_organization:${leadOrg}`];
    const nexMotto = leadOrg === 'memory' ? ' (e memória não é CRM).' : '.';
    recommendations.push({
      digitalCheckId,
      recommendationKey: 'org_centralized',
      category: 'OPERATE',
      priority: getPriority('high'),
      title: 'Organização comercial centralizada',
      description: `Seus contatos e negociações ainda ficam dispersos${nexMotto} Ter um funil unificado evita perder vendas por falta de acompanhamento.`,
      reason: `Lead organization está em '${leadOrg}', indicando ausência de CRM estruturado.`,
      reasonKeys,
    });
  }

  // 2. FOLLOW-UP (OPERATE + AUTOMATE)
  const followUp = getString('follow_up');
  if (['sometimes', 'usually_not', 'no_follow_up'].includes(followUp)) {
    categoryScores.OPERATE += 30;
    categoryScores.AUTOMATE += 20;
    const reasonKeys = [`follow_up:${followUp}`];
    recommendations.push({
      digitalCheckId,
      recommendationKey: 'follow_up_process',
      category: 'OPERATE',
      priority: getPriority('high'),
      title: 'Acompanhamento comercial consistente',
      description:
        'Seu lead chega, mas o próximo passo ainda depende de alguém lembrar de falar com ele. Lembretes e etapas de follow-up garantem que nenhuma oportunidade esfrie.',
      reason: `Follow-up classificado como '${followUp}'.`,
      reasonKeys,
    });
  }

  // 3. INTEGRAÇÃO ENTRE SISTEMAS (AUTOMATE)
  const sysIntegration = getString('system_integration');
  if (['mostly_manual', 'isolated_islands'].includes(sysIntegration)) {
    categoryScores.AUTOMATE += 40;
    const reasonKeys = [`system_integration:${sysIntegration}`];
    recommendations.push({
      digitalCheckId,
      recommendationKey: 'system_integration',
      category: 'AUTOMATE',
      priority: getPriority('high'),
      title: 'Conexão direta entre ferramentas',
      description:
        'Algumas ferramentas da sua operação ainda funcionam como ilhas. Conectar site, WhatsApp e sistemas reduz o retrabalho de transferir informações na mão.',
      reason: `Integração de sistemas marcada como '${sysIntegration}'.`,
      reasonKeys,
    });
  }

  // 4. TRABALHO MANUAL REPETITIVO (AUTOMATE)
  const manualTasks = getArray('manual_tasks').filter((t) => t !== 'none');
  if (manualTasks.length >= 3) {
    categoryScores.AUTOMATE += 35;
    const reasonKeys = [`manual_tasks:count_${manualTasks.length}`, ...manualTasks.map((t) => `manual_task:${t}`)];
    recommendations.push({
      digitalCheckId,
      recommendationKey: 'manual_tasks_automation',
      category: 'AUTOMATE',
      priority: getPriority('high'),
      title: 'Automação de rotinas semanais',
      description:
        'Sua equipe gasta horas preciosas com cadastros, cópias e atualizações manuais que um fluxo automatizado pode executar em segundo plano.',
      reason: `Foram identificadas ${manualTasks.length} tarefas manuais recorrentes.`,
      reasonKeys,
    });
  }

  // 5. SITE E PRESENÇA DIGITAL (BUILD)
  const websiteFunctions = getArray('website_function');
  const leadSources = getArray('lead_sources');
  const hasDigitalAcquisition = leadSources.some((s) => ['instagram', 'google', 'paid_ads', 'website'].includes(s));
  const siteIsPassive =
    websiteFunctions.includes('presentation_only') ||
    websiteFunctions.includes('no_website') ||
    websiteFunctions.length === 0;

  if (siteIsPassive && (hasDigitalAcquisition || leadSources.length > 0)) {
    categoryScores.BUILD += 35;
    const reasonKeys = ['website_function:passive', ...leadSources.map((s) => `lead_source:${s}`)];
    recommendations.push({
      digitalCheckId,
      recommendationKey: 'website_active',
      category: 'BUILD',
      priority: getPriority('medium'),
      title: 'Site ativo no processo comercial',
      description:
        'Seu site apresenta a empresa, mas poderia fazer mais pelo processo comercial: capturando, qualificando contatos e direcionando para a conversa certa.',
      reason: 'Empresa atrai contatos digitais mas o site tem função meramente passiva.',
      reasonKeys,
    });
  }

  // 6. CAPTAÇÃO SEM CRM (BUILD + OPERATE)
  if (websiteFunctions.includes('lead_capture') && leadOrg !== 'crm') {
    categoryScores.BUILD += 15;
    categoryScores.OPERATE += 25;
    const reasonKeys = ['website_function:lead_capture', `lead_organization:${leadOrg}`];
    recommendations.push({
      digitalCheckId,
      recommendationKey: 'website_lead_capture',
      category: 'BUILD',
      priority: getPriority('medium'),
      title: 'Integração de formulários com funil comercial',
      description:
        'Os contatos capturados no site precisam cair automaticamente onde sua equipe atende, com aviso em tempo real para primeiro contato rápido.',
      reason: 'Existe captura de leads pelo site sem integração direta a um CRM.',
      reasonKeys,
    });
  }

  // 7. INTELIGÊNCIA ARTIFICIAL CONCRETA (INTELLIGENCE)
  // Regra estrita: só recomenda INTELLIGENCE se houver interesse E problema compatível com IA
  const aiOpportunities = getArray('ai_opportunity').filter((o) => o !== 'no_idea');
  const hasConcreteNeed =
    manualTasks.includes('faq_reply') ||
    manualTasks.includes('proposals') ||
    manualTasks.includes('copy_paste') ||
    getArray('lead_handling').includes('manual_reply') ||
    aiOpportunities.includes('support');

  if (aiOpportunities.length > 0 && hasConcreteNeed) {
    categoryScores.INTELLIGENCE += 30;
    const reasonKeys = [
      ...aiOpportunities.map((o) => `ai_interest:${o}`),
      'ai_trigger:concrete_operational_bottleneck',
    ];
    recommendations.push({
      digitalCheckId,
      recommendationKey: 'concrete_intelligence',
      category: 'INTELLIGENCE',
      priority: getPriority('medium'),
      title: 'Assistência inteligente sem complexidade inútil',
      description:
        'IA aplicada exatamente onde há gargalo: triagem inicial de mensagens ou organização de informações, sem substituir o toque humano onde ele importa.',
      reason: 'Interesse em IA alinhado a volume de atendimentos manuais ou tarefas analíticas recorrentes.',
      reasonKeys,
    });
  }

  // Determinar oportunidade primária
  const sortedCategories = (Object.keys(categoryScores) as Category[]).sort(
    (a, b) => categoryScores[b] - categoryScores[a]
  );
  const primaryOpportunity = sortedCategories[0] || 'AUTOMATE';

  // Score indicativo interno (0 - 100)
  const totalScore = Math.min(
    100,
    Math.round(
      (categoryScores.BUILD * 0.25 +
        categoryScores.AUTOMATE * 0.35 +
        categoryScores.OPERATE * 0.3 +
        categoryScores.INTELLIGENCE * 0.1) *
        0.8
    )
  );

  return {
    score: totalScore,
    opportunitiesCount: recommendations.length,
    primaryOpportunity,
    recommendations,
  };
}
