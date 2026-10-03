'use client';
import { useRef, useState } from 'react';
import { requestWithTimeout } from '../lib/client-request';
import { ContactLinks } from './contact-links';
const endpoint='https://formspree.io/f/mdekqoqo';
export function ContactBriefing() {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const submitting=useRef(false);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(submitting.current) return;
    const data=new FormData(event.currentTarget);
    if(data.get('_gotcha')) {setError('Não foi possível enviar. Tente novamente.');return;}
    if(!String(data.get('whatsapp')||'').trim()&&!String(data.get('email')||'').trim()){setError('Informe WhatsApp ou e-mail para podermos responder.');return;}
    submitting.current=true;setLoading(true);setError('');
    try {
      const response=await requestWithTimeout(endpoint,{method:'POST',body:data,headers:{Accept:'application/json'}});
      const result=await response.json().catch(()=>null) as {ok?:boolean}|null;
      if(!response.ok||result?.ok!==true) throw new Error('Não conseguimos confirmar o envio. Tente novamente ou fale pelo WhatsApp.');
      window.location.assign('/obrigado');
    } catch {setError('Não conseguimos confirmar o envio. Seus campos foram mantidos. Tente novamente ou fale pelo WhatsApp.');submitting.current=false;setLoading(false);}
  }
  return <form action={endpoint} method="POST" onSubmit={submit} className="briefing" aria-busy={loading} aria-describedby="briefing-help">
    <input type="hidden" name="_subject" value="Nova solicitação de consultoria — ICB AI"/>
    <div aria-hidden="true" style={{position:'absolute',width:0,height:0,overflow:'hidden'}}><label>Deixe em branco<input name="_gotcha" tabIndex={-1} autoComplete="off"/></label></div>
    <div className="form-grid">
      <label>Seu nome<input name="name" required minLength={2} maxLength={120} autoComplete="name"/></label>
      <label>Empresa <small>(opcional)</small><input name="company" maxLength={160} autoComplete="organization"/></label>
      <label>WhatsApp <small>(informe WhatsApp ou e-mail)</small><input name="whatsapp" type="tel" autoComplete="tel" maxLength={30} pattern="[+()0-9 .-]{10,30}" title="Informe o número com DDD."/></label>
      <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254}/></label>
    </div>
    <label>Como podemos ajudar?<textarea name="message" required minLength={10} maxLength={2500} rows={4} placeholder="Conte sobre sua rotina ou o projeto que quer realizar."/></label>
    <p className="fine">Seu briefing será recebido pela !AI para análise e contato. Não envie senhas, dados médicos ou informações sensíveis.</p>
    <label className="consent"><input type="checkbox" name="consent" value="Autorizo a análise do briefing e contato sobre minha solicitação" required/><span>Autorizo o uso das informações para analisar minha solicitação e entrar em contato. Li a <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade (abre em nova aba)</a>.</span></label>
    {error&&<div className="form-error" role="alert"><p>{error}</p><ContactLinks/></div>}
    <button className="button" type="submit" disabled={loading}>{loading?'Enviando…':'Enviar meu briefing'} ↗</button>
    <p className="fine">Sem compromisso de contratação. A análise é feita pela !AI, sem resultado automático.</p>
  </form>;
}
export function BriefingPage(){return <main className="wrap document-page"><a className="logo" href="/">!AI</a><p className="eyebrow">PRIMEIRO, SEU CONTEXTO</p><h1>Conte o que sua operação precisa.</h1><p id="briefing-help">Envie um breve contexto para analisarmos suas prioridades e conversarmos sobre o próximo passo. Não há questionário nem diagnóstico automático nesta etapa.</p><ContactBriefing/><ContactLinks/><a href="/">Voltar ao site</a></main>;}
export function ThankYouPage(){return <main className="wrap document-page"><a className="logo" href="/">!AI</a><p className="eyebrow">BRIEFING ENVIADO</p><h1>Obrigado por compartilhar seu contexto.</h1><p>Após o envio confirmado, sua solicitação fica disponível para a !AI. Vamos analisar seu briefing e entrar em contato pelo canal informado para conversar sobre os próximos passos.</p><p>Não há compromisso de contratação. O escopo e o investimento são apresentados na consultoria.</p><div className="actions"><a className="button" href="/">Voltar ao site</a></div><p>Quer complementar alguma informação?</p><ContactLinks/></main>;}
