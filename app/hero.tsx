'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowIcon } from './arrow-icon';
export default function Hero() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if(!preference.matches){setLoaded(true);setPlaying(true);}
    const pause = () => { video.current?.pause(); setPlaying(false); };
    const visibility = () => { if (document.hidden) pause(); };
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) pause(); });
    if (video.current) observer.observe(video.current);
    preference.addEventListener('change', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); preference.removeEventListener('change', pause); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => { if (loaded && playing) void video.current?.play().catch(() => setPlaying(false)); }, [loaded, playing]);
  function toggle() { if (playing) { video.current?.pause(); setPlaying(false); } else { setLoaded(true); setPlaying(true); } }
  return <section className="cinema-hero" aria-labelledby="hero-title">
    <div className="cinema-scene" aria-hidden="true">
      <img src="/hero-nex-1440.webp" srcSet="/hero-nex-640.webp 640w, /hero-nex-1440.webp 1440w" sizes="100vw" width="1440" height="804" alt="" fetchPriority="high" />
      <video ref={video} muted loop playsInline preload="none" tabIndex={-1} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)} style={{ opacity: loaded && playing ? 1 : 0 }}>{loaded && <source src="/hero-loop.mp4" type="video/mp4" />}</video>
    </div>
    <div className="cinema-copy wrap"><div className="eyebrow">I CAN’T BELIEVE IT’S AI / TECNOLOGIA PARA NEGÓCIOS</div>
      <h1 id="hero-title">Durma enquanto<br />as ferramentas<br /><span>trabalham.</span></h1>
      <p>Sites, sistemas e automações<br />para o seu negócio.</p>
      <a className="button" href="#contato">Vamos conversar <ArrowIcon /></a>
    </div>
    <div className="cinema-controls"><a href="#servicos">Ver serviços <ArrowIcon direction="down" /></a><button type="button" className="text-button" onClick={toggle} aria-pressed={playing}>{playing ? 'Pausar animação' : 'Reproduzir animação'}</button></div>
  </section>;
}
