import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Home from '../app/page';
import { publicPages } from '../app/public-pages';
import { config } from '../app/site.config';
const routes=['/', '/digital-check', '/privacidade', '/obrigado', ...Object.keys(publicPages), '/404'];
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const template=fs.readFileSync('build/index.html','utf8');
for(const route of routes) {
  const page=publicPages[route as keyof typeof publicPages];
  const title=page ? `${page.title} | !AI` : route==='/privacidade' ? 'Privacidade | !AI' : route==='/obrigado' ? 'Obrigado pelo contato | !AI' : route==='/digital-check' ? 'Envie seu briefing | !AI' : route==='/404' ? 'Página não encontrada | !AI' : 'I Can’t Believe It’s AI | Sites, sistemas e automações';
  const description=page?.description || (route==='/digital-check' ? 'Conte seu contexto para a !AI analisar sua solicitação e conversar sobre as prioridades. Sem compromisso de contratação.' : 'Sites, CRM, automações e IA para clínicas e empresas de serviços. Conecte atendimento e acompanhamento. Conheça a !AI.');
  const canonical=config.siteUrl+(route==='/'?'/':route);
  let html=template.replace(/<title>.*?<\/title>/,`<title>${escape(title)}</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(description)}">`).replace(/<meta property="og:[^>]*>/g,'').replace(/<link rel="canonical"[^>]*>/g,'');
  const head=`<link rel="canonical" href="${canonical}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:url" content="${canonical}"><meta property="og:site_name" content="I Can’t Believe It’s AI"><meta property="og:image" content="${config.siteUrl}/share-icbai-v2.jpg"><meta property="og:image:secure_url" content="${config.siteUrl}/share-icbai-v2.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="!AI — Durma enquanto as ferramentas trabalham. Sites, sistemas e automações."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${config.siteUrl}/share-icbai-v2.jpg">${['/digital-check','/obrigado','/404'].includes(route)?'<meta name="robots" content="noindex,follow">':''}`;
  const schema={ '@context':'https://schema.org','@type':'Organization',name:'I Can’t Believe It’s AI',url:config.siteUrl,logo:config.siteUrl+'/icon.svg' };
  html=html.replace('</head>',head+`<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script></head>`).replace('<div id="root"></div>',`<div id="root">${renderToString(<Home initialPath={route}/>)}</div>`);
  const target=path.join('build',route==='/'?'index.html':route.slice(1)+'.html'); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,html);
}
fs.writeFileSync('build/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}/sitemap.xml\n`);
fs.writeFileSync('build/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.filter(r=>!['/404','/digital-check','/obrigado'].includes(r)).map(r=>`<url><loc>${config.siteUrl}${r==='/'?'/':r}</loc></url>`).join('')}</urlset>`);
console.log(`HTML e metadados gerados para ${routes.length} páginas.`);
