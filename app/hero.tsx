'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowIcon } from './arrow-icon';

export default function Hero() {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;

    let blobUrl = '';
    // Caminho da mídia codificado (base64) para não expor a URL direta no markup
    const mediaEndpoint = atob('L2hlcm8tbG9vcC5tcDQ=');

    fetch(mediaEndpoint)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar stream');
        return res.blob();
      })
      .then((blob) => {
        blobUrl = URL.createObjectURL(blob);
        if (element) {
          element.src = blobUrl;
          void element.play().catch(() => {});
        }
      })
      .catch(() => setFailed(true));

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const applyPreference = () => {
      if (preference.matches || !visible || document.hidden) element.pause();
      else void element.play().catch(() => {});
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      applyPreference();
    });

    observer.observe(element);
    preference.addEventListener('change', applyPreference);
    document.addEventListener('visibilitychange', applyPreference);

    return () => {
      observer.disconnect();
      preference.removeEventListener('change', applyPreference);
      document.removeEventListener('visibilitychange', applyPreference);
      element.pause();
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
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
        {!failed && (
          <video
            ref={video}
            autoPlay
            muted
            loop
            playsInline
            tabIndex={-1}
            controls={false}
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            disableRemotePlayback
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
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

