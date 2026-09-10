'use client';

import { useEffect, useRef } from 'react';
import { ArrowIcon } from './arrow-icon';

export default function NotFound() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el) return;

    el.defaultMuted = true;
    el.muted = true;

    const playVideo = () => {
      el.muted = true;
      const promise = el.play();
      if (promise !== undefined) {
        promise.catch(() => {
          const unlock = () => {
            el.muted = true;
            void el.play().catch(() => {});
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
            window.removeEventListener('scroll', unlock);
          };
          window.addEventListener('click', unlock, { once: true, passive: true });
          window.addEventListener('touchstart', unlock, { once: true, passive: true });
          window.addEventListener('scroll', unlock, { once: true, passive: true });
        });
      }
    };

    playVideo();

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isVisible = true;

    const applyPreference = () => {
      if (preference.matches || !isVisible || document.hidden) {
        el.pause();
      } else {
        playVideo();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        applyPreference();
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    preference.addEventListener('change', applyPreference);
    document.addEventListener('visibilitychange', applyPreference);

    return () => {
      observer.disconnect();
      preference.removeEventListener('change', applyPreference);
      document.removeEventListener('visibilitychange', applyPreference);
      el.pause();
    };
  }, []);

  return (
    <main id="not-found" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--carbon)' }}>
      <header className="header">
        <a className="logo" href="/">
          !AI
          <span>
            Tecnologia
            <br />
            para negócios
          </span>
        </a>
        <nav>
          <a href="/#servicos">Soluções</a>
          <a href="/#problemas">Diagnóstico</a>
          <a href="/#planos">Planos</a>
          <a href="/#faq">Dúvidas</a>
          <a href="/digital-check" style={{ color: 'var(--lime)' }}>Digital Check</a>
        </nav>
        <a className="button small" href="/#contato">
          Vamos conversar <ArrowIcon />
        </a>
      </header>

      <section
        className="cinema-hero not-found-hero"
        aria-labelledby="notfound-title"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="cinema-scene"
          aria-hidden="true"
          onContextMenu={(e) => e.preventDefault()}
        >
          <img
            src="/hero-nex-poster.jpeg"
            width="2752"
            height="1536"
            alt=""
            fetchPriority="high"
            draggable={false}
          />
          <video
            ref={video}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/hero-nex-poster.jpeg"
            tabIndex={-1}
            controls={false}
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            disableRemotePlayback
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          >
            <source src="/hero-loop.mp4" type="video/mp4" />
            <source src="/hero-nex-loop.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="cinema-copy wrap">
          <div className="eyebrow">
            <i></i> 404 // PÁGINA NÃO ENCONTRADA
          </div>
          <h1 id="notfound-title">
            Você digitou algo<br />
            que não <span>encontramos.</span>
          </h1>
          <p style={{ maxWidth: '540px' }}>
            O link que você tentou acessar não existe ou foi removido.
            Verifique o endereço digitado ou volte para o início para explorar nossas soluções e diagnósticos.
          </p>

          <div className="not-found-actions">
            <a className="button" href="/">
              Voltar ao início <ArrowIcon />
            </a>
            <a
              className="button outline"
              href="/digital-check"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.28)',
                background: 'rgba(10, 10, 11, 0.55)',
                backdropFilter: 'blur(8px)',
              }}
            >
              Fazer Digital Check <ArrowIcon />
            </a>
          </div>
        </div>

        <div className="cinema-controls">
          <span style={{ color: 'var(--muted)' }}>
            Código de status: <strong>404 — Not Found</strong>
          </span>
          <a href="/#contato">
            Precisa de ajuda? Fale conosco <ArrowIcon />
          </a>
        </div>
      </section>
    </main>
  );
}
