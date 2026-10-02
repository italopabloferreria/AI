import { config } from './site.config';

export function ContactLinks() {
  const { email, whatsapp, phoneLabel } = config.contact;
  return (
    <nav className="contact-links" aria-label="Contato direto" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', marginTop: '24px', overflowWrap: 'anywhere' }}>
      <a className="text-link" href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
        Conversar pelo WhatsApp
      </a>
      <a className="text-link" href={`tel:${whatsapp}`} aria-label={`Ligar para ${phoneLabel}`}>
        {phoneLabel}
      </a>
      <a className="text-link" href={`mailto:${email}`}>{email}</a>
    </nav>
  );
}
