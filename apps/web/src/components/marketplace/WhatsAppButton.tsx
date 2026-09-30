'use client';

import React from 'react';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

interface WhatsAppButtonProps {
  telefono?: string;
  whatsapp?: string;
  titulo: string;
  unidadId?: string;
  className?: string;
}

export function WhatsAppButton({ telefono, whatsapp, titulo, unidadId, className = '' }: WhatsAppButtonProps) {
  const rawPhone = whatsapp || telefono;
  if (!rawPhone) return null;

  // Clean phone number (remove spaces, dashes, parentheses)
  let cleanPhone = rawPhone.replace(/[\s\-()]/g, '');

  // If no plus sign, assume it needs a country code. Defaulting to +54 for Argentina.
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = `+54${cleanPhone}`;
  }

  // Remove plus sign for wa.me link
  cleanPhone = cleanPhone.replace('+', '');

  const defaultMessage = `Hola, me interesa la unidad '${titulo}' que vi publicada en Rendo.`;
  const urlEncodedMessage = encodeURIComponent(defaultMessage);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${urlEncodedMessage}`;

  const handleClick = () => {
    if (unidadId) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      fetch(`${apiUrl}/marketplace/unidades/${unidadId}/contacto`, {
        method: 'POST',
      }).catch(() => {});
    }
  };

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block w-full select-none"
    >
      <InteractiveHoverButton
        variant="whatsapp"
        text="Contactar por WhatsApp"
        className={`w-full h-14 text-sm justify-center rounded-2xl shadow-sm ${className}`}
      />
    </a>
  );
}
