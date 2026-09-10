'use client';

import { useEffect, useRef } from 'react';
import { ArrowIcon } from './arrow-icon';

export default function Hero() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el) return;

    // Garante que as propriedades DOM de autoplay silencioso estejam ativas (contorna bug do React com muted)
    el.defaultMuted = true;
    el.muted = true;

    const playVideo = () => {
      el.muted = true;
      const promise = el.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Se o navegador ou modo de economia de energia suspender autoplay,
          // destrava na primeira interação do usuário (toque, clique ou scroll)
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

    // Tenta reproduzir imediatamente
    playVideo();

    // Pausa se o usuário tiver configurado redução de movimento ou se a aba estiver oculta
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
    <section
      className="cinema-hero"
      aria-labelledby="hero-title"
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
        <div className="eyebrow">I CAN’T BELIEVE IT’S AI / TECNOLOGIA PARA NEGÓCIOS</div>
        <h1 id="hero-title">
          Durma enquanto<br />
          as ferramentas<br />
          <span>trabalham.</span>
        </h1>
        <p>
          Sites, sistemas e automações<br />
          para o seu negócio.
        </p>
        <a className="button" href="#contato">
          Vamos conversar <ArrowIcon />
        </a>
      </div>
      <div className="cinema-controls">
        <a href="#servicos">
          Explore o possível <ArrowIcon direction="down" />
        </a>
      </div>
    </section>
  );
}
