import type { Metadata } from 'next';
import {config} from './site.config';
import './globals.css';
import './hero.css';

import './digital-check/digital-check.css';

export const metadata: Metadata={metadataBase:new URL(config.siteUrl),title:'I Can’t Believe It’s AI | Tecnologia para negócios',description:'Sites, sistemas, CRM, automações e IA para empresas que querem trabalhar melhor. Solicite seu Digital Check gratuito.',alternates:{canonical:'/'},openGraph:{type:'website',locale:'pt_BR',title:'I Can’t Believe It’s AI',description:'Sites, sistemas, automações e IA para empresas que querem trabalhar melhor.',url:'/'},icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
