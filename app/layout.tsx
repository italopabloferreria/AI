import type { Metadata } from 'next';
import {config} from './site.config';
import './globals.css';
import './hero.css';

export const metadata: Metadata={metadataBase:new URL(config.siteUrl),title:'I Can’t Believe It’s AI | Tecnologia para negócios',description:'Sites, sistemas, CRM, automações e IA para empresas que querem trabalhar melhor. Solicite seu Digital Check gratuito.',alternates:{canonical:'/'},openGraph:{type:'website',locale:'pt_BR',title:'I Can’t Believe It’s AI',description:'Tecnologia que parece mágica. Mas funciona de verdade.',url:'/'},icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
