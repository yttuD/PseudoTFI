'use client';

import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';

interface WhatsAppButtonProps {
  telefono: string;
  titulo: string;
  className?: string;
}

export function WhatsAppButton({ telefono, titulo, className = '' }: WhatsAppButtonProps) {
  if (!telefono) return null;

  // Clean phone number (remove spaces, dashes, parentheses)
  let cleanPhone = telefono.replace(/[\s\-()]/g, '');
  
  // If no plus sign, assume it needs a country code. Defaulting to +54 as requested.
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = `+54${cleanPhone}`;
  }
  
  // Remove the plus sign for the wa.me link
  cleanPhone = cleanPhone.replace('+', '');

  const defaultMessage = `Hola, me interesa la unidad '${titulo}' que vi publicada en RENDA.`;
  const urlEncodedMessage = encodeURIComponent(defaultMessage);
  
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${urlEncodedMessage}`;

  return (
    <Button 
      render={<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" />}
      className={`bg-green-600 hover:bg-green-700 text-white w-full ${className}`}
    >
      <Phone className="mr-2 h-4 w-4" />
      Contactar por WhatsApp
    </Button>
  );
}
