'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { whatsappContactUrl } from '@/lib/whatsapp-link';

interface WhatsAppButtonProps {
  telefono?: string;
  whatsapp?: string;
  titulo: string;
  unidadId?: string;
  className?: string;
  text?: string;
  mensaje?: string;
}

export function WhatsAppButton({ telefono, whatsapp, titulo, unidadId, className = '', text, mensaje }: WhatsAppButtonProps) {
  const t = useTranslations('UnitDetail');
  const buttonText = text || t('contactWhatsApp');
  const message = mensaje || t('whatsappMessage', { titulo: titulo || '' });
  const whatsappUrl = whatsappContactUrl(whatsapp || telefono, message);

  const handleClick = () => {
    if (unidadId) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      fetch(`${apiUrl}/marketplace/unidades/${unidadId}/contacto`, {
        method: 'POST',
      }).catch(() => {});
    }
  };

  if (!whatsappUrl) {
    return <p role="status" className="text-center text-sm text-muted-foreground">{t('contactUnavailable')}</p>;
  }

  // A link must be the only interactive element: nested <button> inside <a>
  // previously introduced an invalid focus target and confusing keyboard semantics.
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={buttonText}
      className={`group relative cursor-pointer overflow-hidden border border-[#047857]/40 hover:border-[#047857] text-[#047857] dark:text-[#34D399] dark:border-[#34D399]/40 bg-white/90 dark:bg-azul-800/90 hover:text-white dark:hover:text-white rounded-2xl backdrop-blur-md px-6 py-2.5 min-h-14 w-full inline-flex items-center justify-center text-center font-semibold transition-all duration-300 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    >
      <span className="flex items-center justify-center gap-2" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-[#047857] dark:bg-[#34D399] transition-all duration-300 motion-reduce:transition-none group-hover:scale-[100.8] motion-reduce:group-hover:scale-100" />
        <span className="inline-block transition-all duration-300 motion-reduce:transition-none group-hover:translate-x-12 group-hover:opacity-0 motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:opacity-100 text-sm">
          {buttonText}
        </span>
      </span>
      <span aria-hidden="true" className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-crema dark:text-azul-900 opacity-0 transition-all duration-300 motion-reduce:transition-none group-hover:-translate-x-5 group-hover:opacity-100 motion-reduce:group-hover:translate-x-12 motion-reduce:group-hover:opacity-0">
        <span className="text-sm font-semibold">{buttonText}</span>
        <ArrowRight className="h-4 w-4" />
      </span>
    </a>
  );
}
