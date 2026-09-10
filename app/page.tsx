'use client';

import { ArrowIcon } from './arrow-icon';
import { useEffect, useState } from 'react';
import { DigitalCheckFlow } from './digital-check/digital-check-flow';
import Hero from './hero';
import { Enhancements } from './interactions';
import NotFound from './not-found';
import Sections from './sections';
import { config as c } from './site.config';

export default function Home() {
  const [activeCheck, setActiveCheck] = useState<{
    id: string;
    token: string;
    lead: { name: string; company: string; websiteOrInstagram?: string };
  } | null>(null);

  const [isDigitalCheckRoute, setIsDigitalCheckRoute] = useState(false);
  const [isNotFoundRoute, setIsNotFoundRoute] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDc =
      window.location.pathname === '/digital-check' ||
      window.location.hash === '#digital-check';
    if (isDc) {
      setIsDigitalCheckRoute(true);
      return;
    }
    const path = window.location.pathname;
    if (path && path !== '/' && path !== '/index.html' && !path.startsWith('/api')) {
      setIsNotFoundRoute(true);
    }
  }, []);

  if (isNotFoundRoute) {
    return <NotFound />;
  }

  // Se o Digital Check estiver ativo via submissão do formulário ou rota direta
  if (activeCheck) {
    return (
      <DigitalCheckFlow
        initialCheckId={activeCheck.id}
        initialResumeToken={activeCheck.token}
        initialLead={activeCheck.lead}
        onExit={() => setActiveCheck(null)}
      />
    );
  }

  if (isDigitalCheckRoute) {
    return (
      <DigitalCheckFlow
        onExit={() => {
          setIsDigitalCheckRoute(false);
          if (window.location.pathname === '/digital-check') {
            window.history.pushState(null, '', '/');
          }
        }}
      />
    );
  }

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
        <nav>
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
                <small>{items}</small>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Sections
        onStartCheck={(id, token, lead) => {
          setActiveCheck({ id, token, lead });
        }}
      />
    </main>
  );
}
