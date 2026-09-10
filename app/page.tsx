import { ArrowIcon } from './arrow-icon';
import { config as c } from './site.config';
import Sections from './sections';
import Hero from './hero';
import { Enhancements } from './interactions';

export default function Home() {
  return <main id="inicio">
    <a className="skip" href="#servicos">Pular para o conteúdo</a>
    <Enhancements />
    <header className="header">
      <a className="logo" href="#inicio">!AI<span>Tecnologia<br/>para negócios</span></a>
      <nav>{c.nav.map(([label, id]) => <a key={id} href={'#' + id}>{label}</a>)}</nav>
      <a className="button small" href="#contato">Vamos conversar <ArrowIcon /></a>
    </header>
    <Hero />
    <section id="servicos" className="light section">
      <div className="wrap">
        <div className="eyebrow">01 / TECNOLOGIA COM PROPÓSITO</div>
        <h2>Você não precisa de mais software.<br/><span className="muted">Precisa que as coisas conversem.</span></h2>
        <div className="pillars">{c.pillars.map(([name, desc, items], i) => <article key={name}>
          <span className="index">0{i + 1} <ArrowIcon /></span><h3>{name}.</h3><p>{desc}</p><small>{items}</small>
        </article>)}</div>
      </div>
    </section>
    <Sections />
  </main>;
}
