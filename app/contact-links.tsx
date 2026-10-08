import { config } from './site.config';
import { ArrowIcon } from './arrow-icon';

export function ContactLinks() {
  const { whatsapp } = config.contact;
  return (
    <nav className="contact-links" aria-label="Contato direto">
      <a className="button" href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Gostaria de conversar sobre meu projeto.')}`} target="_blank" rel="noopener noreferrer">
        Falar no WhatsApp <ArrowIcon />
      </a>
    </nav>
  );
}
