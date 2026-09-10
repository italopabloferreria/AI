'use client';
import { ArrowIcon } from './arrow-icon';
import { useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { config } from './site.config';

export function Briefing({
  onStartCheck,
}: {
  onStartCheck?: (
    checkId: string,
    token: string,
    lead: { name: string; company: string; websiteOrInstagram?: string }
  ) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const existingLeadIdRef = useRef<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);

    // 1. Honeypot check (ITEM 27)
    const hp = String(data.get('company_hp') || '');
    if (hp) {
      setError('Submissão inválida.');
      return;
    }

    const name = String(data.get('name') || '').trim();
    const company = String(data.get('company') || '').trim();
    const email = String(data.get('email') || '').trim();
    const whatsapp = String(data.get('whatsapp') || '').trim();
    const website = String(data.get('website') || '').trim();
    const message = String(data.get('message') || '').trim();

    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (name.length < 2 || company.length < 2 || message.length < 10 || cleanPhone.length < 10) {
      setError('Preencha nome, empresa, WhatsApp válido (com DDD) e o desafio atual (mínimo 10 caracteres).');
      return;
    }

    // Validação estrita de consentimento no client antes do envio (ITEM 1)
    if (consent !== true) {
      setError('É necessário autorizar o contato para prosseguir com o Digital Check.');
      return;
    }

    setLoading(true);

    try {
      // 1. Salvar lead no backend antes de iniciar o questionário (evita duplicatas em retry com ref)
      let leadId = existingLeadIdRef.current;
      if (!leadId) {
        const leadRes = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            company,
            email,
            whatsapp,
            website,
            message,
            consent: true, // Boolean literal
          }),
        });

        if (!leadRes.ok) {
          const errData = ((await leadRes.json().catch(() => ({}))) || {}) as Record<string, any>;
          throw new Error(errData.error || 'Não conseguimos salvar seu Digital Check. Tente novamente.');
        }

        const leadJson = (await leadRes.json()) as { leadId: string };
        leadId = leadJson.leadId;
        existingLeadIdRef.current = leadId;
      }

      // 2. Criar sessão de Digital Check com resume token seguro
      const checkRes = await fetch('/api/digital-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });

      if (!checkRes.ok) {
        const errData = ((await checkRes.json().catch(() => ({}))) || {}) as Record<string, any>;
        throw new Error(errData.error || 'Falha ao iniciar a sessão do Digital Check.');
      }

      const { digitalCheckId, resumeToken } = (await checkRes.json()) as {
        digitalCheckId: string;
        resumeToken: string;
      };

      // 3. Salvar temporariamente na sessionStorage para tolerância a refresh
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ai_dc_id', digitalCheckId);
        sessionStorage.setItem('ai_dc_token', resumeToken);
      }

      // 4. Transição fluida para o fluxo de diagnóstico
      if (onStartCheck) {
        onStartCheck(digitalCheckId, resumeToken, { name, company, websiteOrInstagram: website });
      } else if (typeof window !== 'undefined') {
        window.location.assign('/digital-check');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não conseguimos salvar seu Digital Check. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="briefing">
      {/* Honeypot acessível para detecção de bots sem display:none (ITEM 27) */}
      <div
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          height: 0,
          width: 0,
          overflow: 'hidden',
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <label htmlFor="company_hp_field">Deixe em branco</label>
        <input
          id="company_hp_field"
          name="company_hp"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="form-grid">
        <label>
          Seu nome
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Como podemos chamar você?"
          />
        </label>
        <label>
          Empresa
          <input
            name="company"
            autoComplete="organization"
            required
            minLength={2}
            maxLength={160}
            placeholder="Nome do seu negócio"
          />
        </label>
        <label>
          E-mail profissional
          <input
            name="email"
            autoComplete="email"
            type="email"
            required
            maxLength={254}
            placeholder="voce@empresa.com.br"
          />
        </label>
        <label>
          WhatsApp <small>(com DDD)</small>
          <input
            name="whatsapp"
            autoComplete="tel"
            type="tel"
            required
            maxLength={30}
            placeholder="(11) 99999-9999"
          />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          Site ou Instagram <small>(opcional)</small>
          <input
            name="website"
            maxLength={250}
            placeholder="Onde encontramos sua empresa na internet?"
          />
        </label>
      </div>

      <label>
        O que está tomando seu tempo?
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2500}
          rows={4}
          placeholder="Conte sobre a tarefa, processo ou projeto que você quer melhorar."
        />
      </label>

      <p className="fine" style={{ margin: '8px 0 16px', color: 'var(--muted)' }}>
        Usamos as informações enviadas para preparar seu Digital Check e entrar em contato sobre o diagnóstico. Não envie senhas, dados médicos ou outras informações sensíveis.
      </p>

      <label className="consent">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          aria-label="Autorizo o tratamento das informações para meu diagnóstico"
        />
        <span>
          Autorizo o tratamento das informações enviadas para preparação do meu Digital Check e contato sobre o diagnóstico. Li a{' '}
          <a href="#privacidade">Política de Privacidade</a>.
        </span>
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Preparando...' : 'Preparar meu Digital Check'} <ArrowIcon />
      </button>

      <p className="fine">
        Gratuito. Sem compromisso. Uma boa conversa antes de qualquer proposta.
      </p>
    </form>
  );
}

export function Enhancements() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('seen');
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.06 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mobile-menu">
      <button
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(!open)}
      >
        {open ? 'Fechar ×' : 'Menu +'}
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Navegação móvel">
          {config.nav.map((item: string[]) => {
            const [label, id] = item;
            return (
              <a key={id} href={'#' + id} onClick={() => setOpen(false)}>
                {label} <ArrowIcon />
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}
