import type { Metadata } from 'next';
import { DigitalCheckFlow } from './digital-check-flow';

export const metadata: Metadata = {
  title: '!AI Digital Check | Diagnóstico Operacional e Tecnológico',
  description: 'Descubra onde estão os gargalos da sua operação e identifique oportunidades de automação, integrações e CRM.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DigitalCheckPage() {
  return <DigitalCheckFlow />;
}
