import type { QuestionDefinition } from './types';

export interface StepDefinition {
  id: number;
  eyebrow: string;
  stepNumberStr: string; // '01 / 05'
  title: string;
  description: string;
  key: string;
  type: 'single' | 'multiple' | 'composite_bottleneck';
  hasOther?: boolean;
  otherPlaceholder?: string;
  options?: {
    value: string;
    label: string;
    nexNote?: string;
  }[];
}

export const DIGITAL_CHECK_STEPS: StepDefinition[] = [
  {
    id: 1,
    stepNumberStr: '01 / 05',
    eyebrow: '01 / 05 • AQUISIÇÃO',
    title: 'Como novos clientes chegam até sua empresa?',
    description: 'Selecione os canais principais por onde chegam contatos e oportunidades.',
    key: 'lead_sources',
    type: 'multiple',
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
  {
    id: 2,
    stepNumberStr: '02 / 05',
    eyebrow: '02 / 05 • GESTÃO COMERCIAL',
    title: 'Onde suas oportunidades e contatos ficam organizados?',
    description: 'Como sua equipe armazena os leads e conduz o acompanhamento comercial.',
    key: 'lead_organization',
    type: 'single',
    options: [
      { value: 'crm', label: 'CRM estruturado (com histórico e lembretes)' },
      { value: 'spreadsheet', label: 'Planilhas e anotações manuais da equipe' },
      { value: 'whatsapp', label: 'Direto no WhatsApp (sem processo de follow-up)' },
      { value: 'memory', label: 'Memória da equipe (quando alguém lembra)', nexNote: 'memória não é CRM.' },
      { value: 'no_place', label: 'Não temos um local ou processo centralizado' },
    ],
  },
  {
    id: 3,
    stepNumberStr: '03 / 05',
    eyebrow: '03 / 05 • ROTINA OPERACIONAL',
    title: 'O que sua equipe repete manualmente toda semana?',
    description: 'Selecione as tarefas operacionais que consomem tempo recorrente.',
    key: 'manual_tasks',
    type: 'multiple',
    hasOther: true,
    otherPlaceholder: 'Outra tarefa manual',
    options: [
      { value: 'copy_paste', label: 'Copiar informações entre telas e sistemas' },
      { value: 'register_leads', label: 'Cadastrar clientes e contatos na mão' },
      { value: 'send_messages', label: 'Disparar mensagens padrão e cobranças' },
      { value: 'follow_up_manual', label: 'Lembrar e cobrar respostas de contatos' },
      { value: 'scheduling', label: 'Agendar e confirmar reuniões ou horários' },
      { value: 'proposals', label: 'Gerar propostas e orçamentos' },
      { value: 'update_sheets', label: 'Atualizar planilhas de controle e relatórios' },
      { value: 'faq_reply', label: 'Responder sempre as mesmas dúvidas básicas' },
      { value: 'none', label: 'Nenhuma dessas' },
      { value: 'other', label: 'Outro' },
    ],
  },
  {
    id: 4,
    stepNumberStr: '04 / 05',
    eyebrow: '04 / 05 • SITE & AUTOMAÇÃO',
    title: 'Como seu site e suas ferramentas participam da rotina hoje?',
    description: 'Selecione como a tecnologia apoia a sua operação atualmente.',
    key: 'website_and_tools',
    type: 'multiple',
    options: [
      { value: 'presentation_only', label: 'Site apenas apresenta a empresa (institucional básico)' },
      { value: 'lead_capture', label: 'Site captura contatos e formulários para a equipe' },
      { value: 'sends_to_crm', label: 'Site conectado diretamente a CRM e automações' },
      { value: 'mostly_manual', label: 'Nossas ferramentas não conversam (passamos dados na mão)' },
      { value: 'ai_interest', label: 'Gostaríamos de automação ou IA para triagem e atendimento' },
      { value: 'no_website', label: 'Ainda não temos site' },
    ],
  },
  {
    id: 5,
    stepNumberStr: '05 / 05',
    eyebrow: '05 / 05 • GARGALO PRINCIPAL & URGÊNCIA',
    title: 'Qual é o principal gargalo da sua operação hoje?',
    description: 'Conte a tarefa, processo ou situação que mais toma tempo ou gera retrabalho.',
    key: 'main_bottleneck',
    type: 'composite_bottleneck',
  },
];

export const URGENCY_SCALE_OPTIONS = [
  { value: '1', label: 'Só quero entender melhor', num: '1' },
  { value: '2', label: 'É um incômodo leve', num: '2' },
  { value: '3', label: 'Já está atrapalhando a rotina', num: '3' },
  { value: '4', label: 'Está custando tempo ou dinheiro', num: '4' },
  { value: '5', label: 'Preciso resolver isso logo', num: '5' },
];
