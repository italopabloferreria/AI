import type { QuestionDefinition } from './types';

export const DIGITAL_CHECK_QUESTIONS: QuestionDefinition[] = [
  // 01 / 10
  {
    id: 1,
    step: 1,
    stepNumberStr: '01 / 10',
    eyebrow: '01 / 10 • AQUISIÇÃO',
    key: 'lead_sources',
    type: 'multiple',
    question: 'Como novos clientes chegam até sua empresa?',
    description: 'Selecione os principais canais por onde chegam contatos e oportunidades.',
    hasOther: true,
    otherPlaceholder: 'Qual outro canal?',
    options: [
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'google', label: 'Google' },
      { value: 'website', label: 'Site próprio' },
      { value: 'referral', label: 'Indicação' },
      { value: 'paid_ads', label: 'Tráfego pago' },
      { value: 'outbound', label: 'Prospecção ativa' },
      { value: 'other', label: 'Outro' },
    ],
  },

  // 02 / 10
  {
    id: 2,
    step: 2,
    stepNumberStr: '02 / 10',
    eyebrow: '02 / 10 • PRIMEIRO CONTATO',
    key: 'lead_handling',
    type: 'multiple',
    question: 'Quando alguém demonstra interesse, o que acontece?',
    description: 'Como é feito o primeiro atendimento comercial.',
    hasOther: true,
    otherPlaceholder: 'Descreva brevemente',
    options: [
      { value: 'manual_reply', label: 'Alguém responde manualmente' },
      { value: 'goes_to_whatsapp', label: 'O contato vai para o WhatsApp' },
      { value: 'auto_crm', label: 'Entra automaticamente em um CRM' },
      { value: 'auto_reply', label: 'Existe resposta automática inicial' },
      { value: 'depends_available', label: 'Depende de quem estiver disponível' },
      { value: 'no_process', label: 'Não existe processo definido' },
      { value: 'other', label: 'Outro' },
    ],
  },

  // 03 / 10
  {
    id: 3,
    step: 3,
    stepNumberStr: '03 / 10',
    eyebrow: '03 / 10 • GESTÃO COMERCIAL',
    key: 'lead_organization',
    type: 'single',
    question: 'Onde suas oportunidades e contatos ficam organizados?',
    description: 'Como sua equipe armazena e consulta os contatos.',
    options: [
      { value: 'crm', label: 'CRM estruturado (com histórico e alertas)' },
      { value: 'spreadsheet', label: 'Planilhas e anotações manuais' },
      { value: 'whatsapp', label: 'Direto no WhatsApp' },
      { value: 'memory', label: 'Memória da equipe', nexNote: 'memória não é CRM.' },
      { value: 'paper', label: 'Anotações / Papel' },
      { value: 'no_place', label: 'Não temos um local centralizado' },
    ],
  },

  // 04 / 10
  {
    id: 4,
    step: 4,
    stepNumberStr: '04 / 10',
    eyebrow: '04 / 10 • FOLLOW-UP',
    key: 'follow_up',
    type: 'single',
    question: 'Se um potencial cliente não responder hoje, alguém lembra de falar com ele depois?',
    description: 'Como funciona o acompanhamento após o primeiro contato.',
    options: [
      { value: 'auto', label: 'Sim, automaticamente' },
      { value: 'crm_alert', label: 'Sim, alertado pelo CRM' },
      { value: 'manual_track', label: 'Alguém acompanha manualmente' },
      { value: 'sometimes', label: 'Às vezes' },
      { value: 'no_follow_up', label: 'Não existe follow-up definido' },
    ],
  },

  // 05 / 10
  {
    id: 5,
    step: 5,
    stepNumberStr: '05 / 10',
    eyebrow: '05 / 10 • ROTINA OPERACIONAL',
    key: 'manual_tasks',
    type: 'multiple',
    question: 'O que sua equipe repete manualmente toda semana?',
    description: 'Selecione as tarefas operacionais que consomem tempo recorrente.',
    hasOther: true,
    otherPlaceholder: 'Outra tarefa manual',
    options: [
      { value: 'copy_paste', label: 'Copiar informações entre telas e sistemas' },
      { value: 'register_leads', label: 'Cadastrar clientes e oportunidades na mão' },
      { value: 'send_messages', label: 'Disparar mensagens padrão e cobranças' },
      { value: 'follow_up_manual', label: 'Lembrar de falar com contatos sumidos' },
      { value: 'scheduling', label: 'Agendar e confirmar horários ou reuniões' },
      { value: 'proposals', label: 'Gerar propostas e orçamentos' },
      { value: 'update_sheets', label: 'Atualizar planilhas de controle e relatórios' },
      { value: 'faq_reply', label: 'Responder sempre as mesmas dúvidas básicas' },
      { value: 'none', label: 'Nenhuma dessas' },
      { value: 'other', label: 'Outro' },
    ],
  },

  // 06 / 10
  {
    id: 6,
    step: 6,
    stepNumberStr: '06 / 10',
    eyebrow: '06 / 10 • INTEGRAÇÃO',
    key: 'system_integration',
    type: 'single',
    question: 'Suas ferramentas conversam entre si?',
    description: 'Exemplo: site → WhatsApp → CRM → agenda → financeiro.',
    options: [
      { value: 'most_integrated', label: 'Sim, a maior parte é integrada' },
      { value: 'some_integrated', label: 'Algumas coisas são integradas' },
      { value: 'mostly_manual', label: 'Quase tudo depende de passar dados na mão' },
      { value: 'isolated_islands', label: 'Cada sistema funciona isolado como uma ilha' },
      { value: 'unknown', label: 'Não sei avaliar' },
    ],
  },

  // 07 / 10
  {
    id: 7,
    step: 7,
    stepNumberStr: '07 / 10',
    eyebrow: '07 / 10 • PRESENÇA DIGITAL',
    key: 'website_function',
    type: 'multiple',
    question: 'Hoje seu site participa de verdade da operação?',
    description: 'O papel do seu site na geração e condução de negócios.',
    options: [
      { value: 'no_website', label: 'Não temos site ainda' },
      { value: 'presentation_only', label: 'Apenas apresenta a empresa (institucional básico)' },
      { value: 'lead_capture', label: 'Captura contatos e formulários' },
      { value: 'online_booking', label: 'Permite agendamento / compra' },
      { value: 'sends_to_crm', label: 'Conectado diretamente a CRM e automações' },
    ],
  },

  // 08 / 10
  {
    id: 8,
    step: 8,
    stepNumberStr: '08 / 10',
    eyebrow: '08 / 10 • POTENCIAL DE IA',
    key: 'ai_opportunity',
    type: 'multiple',
    question: 'Onde você acredita que IA ou automações poderiam ajudar?',
    description: 'Áreas onde tecnologia inteligente traria mais alívio para o negócio.',
    options: [
      { value: 'support', label: 'Atendimento e triagem inicial de mensagens' },
      { value: 'sales', label: 'Aceleração de propostas e vendas' },
      { value: 'reports', label: 'Relatórios e análise de dados' },
      { value: 'process_auto', label: 'Eliminar rotinas operacionais chatas' },
      { value: 'no_idea', label: 'Não faço ideia (queremos entender as opções)' },
    ],
  },

  // 09 / 10
  {
    id: 9,
    step: 9,
    stepNumberStr: '09 / 10',
    eyebrow: '09 / 10 • GARGALO PRINCIPAL',
    key: 'main_bottleneck',
    type: 'textarea',
    question: 'Se você pudesse eliminar um único gargalo hoje, qual seria?',
    description: 'Conte a tarefa, processo ou situação que mais toma tempo, gera retrabalho ou faz oportunidades se perderem.',
    placeholder: 'Ex: Demoramos muito para responder contatos no WhatsApp, passamos dados para planilhas na mão e perdemos propostas por falta de acompanhamento...',
    maxLength: 1000,
  },

  // 10 / 10
  {
    id: 10,
    step: 10,
    stepNumberStr: '10 / 10',
    eyebrow: '10 / 10 • URGÊNCIA',
    key: 'urgency',
    type: 'scale',
    question: 'Quanto isso está atrapalhando sua operação hoje?',
    description: 'O nível de prioridade para destravar esse processo na empresa.',
    options: [
      { value: '1', label: '1 — Só quero entender melhor' },
      { value: '2', label: '2 — É um incômodo leve' },
      { value: '3', label: '3 — Já está atrapalhando a rotina' },
      { value: '4', label: '4 — Está custando tempo ou dinheiro' },
      { value: '5', label: '5 — Preciso resolver isso logo' },
    ],
  },
];

export const TOTAL_STEPS = DIGITAL_CHECK_QUESTIONS.length; // 10
