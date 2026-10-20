import React from 'react';
import { InvitationInbox } from '@/components/delegados/InvitationInbox';

export default function InvitacionesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[70vh]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#131F3C] dark:text-[#F5F3EE]">
          Invitaciones de Colaboración
        </h1>
        <p className="text-sm text-[#667085] dark:text-[#AEB7C7] mt-1">
          Gestiona las invitaciones que has recibido para colaborar como Delegado en espacios de trabajo inmobiliarios.
        </p>
      </div>

      <InvitationInbox />
    </div>
  );
}
