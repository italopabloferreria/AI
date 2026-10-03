import type { Metadata } from 'next';
import {config} from './site.config';
import './globals.css';
import './hero.css';

import './digital-check/digital-check.css';

export const metadata: Metadata={metadataBase:new URL(config.siteUrl),title:'I Can’t Believe It’s AI | Tecnologia para negócios',description:'Sites, sistemas, CRM, automações e IA para empresas que querem trabalhar melhor. Conte seu projeto pelo formulário.',alternates:{canonical:'/'},openGraph:{type:'website',locale:'pt_BR',title:'I Can’t Believe It’s AI',description:'Sites, sistemas, automações e IA para empresas que querem trabalhar melhor.',url:'/',siteName:'I Can’t Believe It’s AI',images:[{url:'/share-icbai-v2.jpg',width:1200,height:630,alt:'!AI — Sites, sistemas e automações'}]},twitter:{card:'summary_large_image',images:['/share-icbai-v2.jpg']},icons:{icon:[{url:'/icon.svg',type:'image/svg+xml'},{url:'/icon-32.png',sizes:'32x32',type:'image/png'}],apple:'/icon-180.png'}};
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

import './audit.css';
