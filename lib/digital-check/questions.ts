import type { QuestionDefinition } from './types';

export interface StepBlockDefinition {
  id: number;
  eyebrow: string;
  title: string;
  description: string;
  questions: QuestionDefinition[];
}

export const DIGITAL_CHECK_QUESTIONS: QuestionDefinition[] = [
  // ETAPA 1
  {
    key: 'lead_sources',
    step: 1,
    type: 'multiple',
    question: 'Como novos clientes chegam até sua empresa?',
    description: 'Selecione os principais canais que trazem contatos.',
    hasOther: true,
    otherPlaceholder: 'Qual outro canal?',
    options: [
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'google', label: 'Google' },
      { value: 'website', label: 'Site' },
      { value: 'referral', label: 'Indicação' },
      { value: 'paid_ads', label: 'Tráfego pago' },
      { value: 'outbound', label: 'Prospecção ativa' },
      { value: 'other', label: 'Outro' },
    ],
  },
  {
    key: 'lead_handling',
    step: 1,
    type: 'multiple',
    question: 'Quando alguém demonstra interesse, o que acontece?',
    description: 'Como é feito o primeiro contato.',
    hasOther: true,
    otherPlaceholder: 'Descreva brevemente',
    options: [
      { value: 'manual_reply', label: 'Alguém responde manualmente' },
      { value: 'goes_to_whatsapp', label: 'O contato vai para o WhatsApp' },
      { value: 'auto_crm', label: 'Entra automaticamente em um CRM' },
      { value: 'auto_reply', label: 'Existe resposta automática inicial' },
      { value: 'depends_available', label: 'Depende de quem estiver disponível' },
      { value: 'no_process', label: 'Não existe processo definido' },
    ],
  },

  // ETAPA 2
  {
    key: 'lead_organization',
    step: 2,
    type: 'single',
    question: 'Onde suas oportunidades e contatos ficam organizados?',
    options: [
      { value: 'crm', label: 'CRM estruturado' },
      { value: 'spreadsheet', label: 'Planilhas' },
      { value: 'whatsapp', label: 'Direto no WhatsApp' },
      { value: 'memory', label: 'Memória da equipe', nexNote: 'memória não é CRM.' },
      { value: 'paper', label: 'Anotações / Papel' },
      { value: 'no_place', label: 'Não temos um lugar definido' },
    ],
  },
  {
    key: 'follow_up',
    step: 2,
    type: 'single',
    question: 'Se um potencial cliente não responder hoje, alguém lembra de falar com ele depois?',
    options: [
      { value: 'auto', label: 'Sim, automaticamente' },
      { value: 'crm_alert', label: 'Sim, alertado pelo CRM' },
      { value: 'manual_track', label: 'Alguém acompanha manualmente' },
      { value: 'sometimes', label: 'Às vezes' },
      { value: 'no_follow_up', label: 'Não existe follow-up definido' },
    ],
  },

  // ETAPA 3
  {
    key: 'manual_tasks',
    step: 3,
    type: 'multiple',
    question: 'O que sua equipe repete manualmente toda semana?',
    description: 'Tarefas operacionais recorrentes.',
    hasOther: true,
    otherPlaceholder: 'Outra tarefa manual',
    options: [
      { value: 'copy_paste', label: 'Copiar informações entre telas' },
      { value: 'register_leads', label: 'Cadastrar clientes e leads' },
      { value: 'send_messages', label: 'Disparar mensagens padrão' },
      { value: 'follow_up_manual', label: 'Lembrar e cobrar respostas' },
      { value: 'scheduling', label: 'Agendar e confirmar horários' },
      { value: 'proposals', label: 'Gerar propostas / orçamentos' },
      { value: 'update_sheets', label: 'Atualizar planilhas e relatórios' },
      { value: 'faq_reply', label: 'Responder perguntas repetitivas' },
      { value: 'none', label: 'Nenhuma dessas' },
    ],
  },
  {
    key: 'system_integration',
    step: 3,
    type: 'single',
    question: 'Suas ferramentas conversam entre si?',
    context: 'Exemplo: site → WhatsApp → CRM → agenda → financeiro.',
    options: [
      { value: 'most_integrated', label: 'Sim, a maior parte é integrada' },
      { value: 'some_integrated', label: 'Algumas coisas são integradas' },
      { value: 'mostly_manual', label: 'Quase tudo depende de passar dados na mão' },
      { value: 'isolated_islands', label: 'Cada sistema funciona isolado como uma ilha' },
      { value: 'unknown', label: 'Não sei avaliar' },
    ],
  },

  // ETAPA 4
  {
    key: 'website_function',
    step: 4,
    type: 'multiple',
    question: 'Hoje seu site participa de verdade da operação?',
    options: [
      { value: 'no_website', label: 'Não temos site ainda' },
      { value: 'presentation_only', label: 'Apenas apresenta a empresa (institucional básico)' },
      { value: 'lead_capture', label: 'Captura contatos e formulários' },
      { value: 'online_booking', label: 'Permite agendamento / compra' },
      { value: 'sends_to_crm', label: 'Conectado diretamente ao CRM e automações' },
    ],
  },
  {
    key: 'ai_opportunity',
    step: 4,
    type: 'multiple',
    question: 'Onde você acredita que IA ou automações poderiam ajudar?',
    options: [
      { value: 'support', label: 'Atendimento e triagem inicial de mensagens' },
      { value: 'sales', label: 'Aceleração de propostas e vendas' },
      { value: 'reports', label: 'Relatórios e análise de dados' },
      { value: 'process_auto', label: 'Eliminar rotinas operacionais chatas' },
      { value: 'no_idea', label: 'Não faço ideia (queremos entender as opções)' },
    ],
  },

  // ETAPA 5
  {
    key: 'main_bottleneck',
    step: 5,
    type: 'textarea',
    question: 'Se você pudesse eliminar um único gargalo hoje, qual seria?',
    placeholder: 'Conte a tarefa, processo ou situação que mais está tomando tempo, gerando retrabalho ou fazendo oportunidades se perderem.',
    maxLength: 1000,
  },
  {
    key: 'urgency',
    step: 5,
    type: 'scale',
    question: 'Quanto isso está atrapalhando sua operação hoje?',
    options: [
      { value: '1', label: '1 — Só quero entender melhor' },
      { value: '2', label: '2 — É um incômodo leve' },
      { value: '3', label: '3 — Já está atrapalhando a rotina' },
      { value: '4', label: '4 — Está custando tempo ou dinheiro' },
      { value: '5', label: '5 — Preciso resolver isso logo' },
    ],
  },
];

export const DIGITAL_CHECK_STEPS: StepBlockDefinition[] = [
  {
    id: 1,
    eyebrow: '01 / 05 • AQUISIÇÃO & ATENDIMENTO',
    title: 'Como os clientes encontram você e como são recebidos',
    description: 'Mapeamos a entrada dos contatos para entender onde começam as conversas.',
    questions: DIGITAL_CHECK_QUESTIONS.filter((q) => q.step === 1),
  },
  {
    id: 2,
    eyebrow: '02 / 05 • GESTÃO COMERCIAL',
    title: 'Onde as oportunidades ficam e como é o follow-up',
    description: 'Entendemos como sua equipe conduz as negociações após o primeiro contato.',
    questions: DIGITAL_CHECK_QUESTIONS.filter((q) => q.step === 2),
  },
  {
    id: 3,
    eyebrow: '03 / 05 • OPERAÇÃO & INTEGRAÇÕES',
    title: 'Tarefas repetitivas e conexão entre ferramentas',
    description: 'Identificamos quanto tempo é gasto transferindo dados manualmente.',
    questions: DIGITAL_CHECK_QUESTIONS.filter((q) => q.step === 3),
  },
  {
    id: 4,
    eyebrow: '04 / 05 • PRESENÇA DIGITAL & IA',
    title: 'Papel do site e potencial de tecnologia inteligente',
    description: 'Avaliamos a maturidade da sua presença digital e onde IA realmente faz sentido.',
    questions: DIGITAL_CHECK_QUESTIONS.filter((q) => q.step === 4),
  },
  {
    id: 5,
    eyebrow: '05 / 05 • GARGALO PRINCIPAL & URGÊNCIA',
    title: 'O maior desafio da sua rotina e o impacto atual',
    description: 'O foco número um para destravar a produtividade da sua empresa.',
    questions: DIGITAL_CHECK_QUESTIONS.filter((q) => q.step === 5),
  },
];
