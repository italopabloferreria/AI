'use client';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Briefing } from './interactions';
import { ContactLinks } from './contact-links';
export const LazyDigitalCheckFlow = lazy(() => import('./digital-check/digital-check-flow').then(m => ({ default: m.DigitalCheckFlow })));
export function DiagnosticEntry() {
  const [session, setSession] = useState<{ id: string; token: string; lead?: {name:string;company:string;websiteOrInstagram?:string} } | null>(null);
  useEffect(() => { try { const id=sessionStorage.getItem('ai_dc_id'); const token=sessionStorage.getItem('ai_dc_token'); if(id&&token) setSession({id,token}); } catch { /* Form remains available when storage is disabled. */ } },[]);
  if(session) return <Suspense fallback={<main className="wrap document-page" role="status">Carregando seu diagnóstico…</main>}><LazyDigitalCheckFlow initialCheckId={session.id} initialResumeToken={session.token} initialLead={session.lead} onExit={()=>{setSession(null); window.location.assign('/#contato');}} /></Suspense>;
  return <main className="wrap document-page diagnostic-entry"><a className="logo" href="/">!AI</a><p className="eyebrow">DIGITAL CHECK / GRATUITO</p><h1>Encontre as prioridades da sua operação.</h1><p id="briefing-help">Primeiro, conte seu contexto. Depois, responda dez perguntas. O resultado é uma indicação inicial de oportunidades, sem obrigação de contratar. Não inclui implementação nem auditoria técnica completa.</p><Briefing onStartCheck={(id,token,lead)=>setSession({id,token,lead})}/><p>Prefere conversar sobre um projeto?</p><ContactLinks/><a className="text-link" href="/">Voltar ao site</a></main>;
}
