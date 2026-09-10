export type Category = 'BUILD' | 'AUTOMATE' | 'INTELLIGENCE' | 'OPERATE';

export type Priority = 'high' | 'medium' | 'low';

export type DigitalCheckStatus = 'started' | 'in_progress' | 'completed';

export type CanonicalQuestionKey =
  | 'lead_sources'
  | 'lead_handling'
  | 'lead_organization'
  | 'follow_up'
  | 'manual_tasks'
  | 'system_integration'
  | 'website_function'
  | 'ai_opportunity'
  | 'main_bottleneck'
  | 'urgency';

export interface Lead {
  id: string;
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
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalCheck {
  id: string;
  leadId: string;
  resumeTokenHash: string;
  status: DigitalCheckStatus;
  currentStep: number; // 1 a 10
  score?: number;
  primaryOpportunity?: Category;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AnswerValue = string | number | string[] | Record<string, unknown>;

export interface DigitalCheckAnswer {
  id?: string;
  digitalCheckId: string;
  questionKey: string;
  answerJson: AnswerValue;
  createdAt?: string;
  updatedAt?: string;
}

export interface DigitalCheckRecommendation {
  id?: string;
  digitalCheckId: string;
  recommendationKey: string;
  category: Category;
  priority: Priority;
  title: string;
  description: string;
  reason: string;
  reasonKeys: string[];
  createdAt?: string;
}

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  nexNote?: string;
}

export interface QuestionDefinition {
  id: number;
  step: number; // 1 a 10
  stepNumberStr: string; // '01 / 10' a '10 / 10'
  eyebrow: string;
  key: CanonicalQuestionKey;
  type: 'single' | 'multiple' | 'textarea' | 'scale';
  question: string;
  description?: string;
  context?: string;
  options?: QuestionOption[];
  hasOther?: boolean;
  otherPlaceholder?: string;
  placeholder?: string;
  maxLength?: number;
}

export interface DiagnosticResult {
  score: number;
  opportunitiesCount: number;
  primaryOpportunity: Category;
  recommendations: DigitalCheckRecommendation[];
  leadSummary?: {
    name: string;
    company: string;
    email: string;
  };
}
