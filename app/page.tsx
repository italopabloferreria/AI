'use client';

import { ArrowIcon } from './arrow-icon';
import { useEffect, useState } from 'react';
import { BriefingPage, ThankYouPage } from './contact-briefing';
import { PrivacyPage, PublicPage, publicPages } from './public-pages';
import Hero from './hero';
import './client-brands.css';
import { Enhancements } from './interactions';
import NotFound from './not-found';
import Sections from './sections';
import { config as c } from './site.config';
import {emitSiteEvent} from '../lib/site-events';

export default function Home({initialPath='/'}:{initialPath?:string}) {
  const [hashCheck,setHashCheck]=useState(false);
  useEffect(()=>{const listener=(event:MouseEvent)=>{const link=(event.target as Element)?.closest?.('a'); const href=link?.getAttribute('href')||''; const channel=href.startsWith('https://wa.me/')?'whatsapp':href.startsWith('mailto:')?'email':href.startsWith('tel:')?'phone':href==='/digital-check'?'diagnostic':null;if(channel)emitSiteEvent('cta_click',{channel});};document.addEventListener('click',listener);return()=>document.removeEventListener('click',listener);},[]);
  useEffect(()=>{if(window.location.hash==='#digital-check') setHashCheck(true);},[]);
  if(initialPath === '/obrigado') return <ThankYouPage />;
  if(initialPath === '/privacidade') return <PrivacyPage />;
  if(initialPath in publicPages) return <PublicPage path={initialPath as keyof typeof publicPages} />;
  if(initialPath === '/digital-check' || hashCheck) return <BriefingPage />;
  if(!['/','/index.html'].includes(initialPath)) return <NotFound />;
  return (
    <main id="inicio">
      <a className="skip" href="#servicos">
        Pular para o conteúdo
      </a>
      <Enhancements />
      <header className="header">
        <a className="logo" href="#inicio">
          !AI
          <span>
            Tecnologia
            <br />
            para negócios
          </span>
        </a>
        <nav aria-label="Navegação principal">
          {c.nav.map(([label, id]) => (
            <a key={id} href={'#' + id}>
              {label}
            </a>
          ))}
        </nav>
        <a className="button small" href="#contato">
          Vamos conversar <ArrowIcon />
        </a>
      </header>
      <Hero />
      <section id="servicos" className="light section">
        <div className="wrap">
          <div className="eyebrow">01 / TECNOLOGIA COM PROPÓSITO</div>
          <h2>
            Você não precisa de mais software.
            <br />
            <span className="muted">Precisa que as coisas conversem.</span>
          </h2>
          <div className="pillars">
            {c.pillars.map(([name, desc, items], i) => (
              <article key={name}>
                <span className="index">
                  0{i + 1} <ArrowIcon />
                </span>
                <h3>{name}.</h3>
                <p>{desc}</p>
                <small>{items}</small><a className="text-link" href={i===0?'/servicos/sites':i===3?'/crm':'/servicos/automacoes'}>Conhecer a solução <ArrowIcon /></a>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Sections />
    </main>
  );
}
