'use client';

import React, { useEffect, useState } from 'react';
import { ReceivedInvitation } from '@tfi/types';
import { getClientSessionToken } from '@/lib/supabase/client-auth';
import { useRouter } from 'next/navigation';
import { Mail, Check, X, AlertCircle, Clock, Building2 } from 'lucide-react';

interface InvitationInboxProps {
  initialInvitations?: ReceivedInvitation[];
}

export function InvitationInbox({ initialInvitations }: InvitationInboxProps) {
  const router = useRouter();
  const [invitations, setInvitations] = useState<ReceivedInvitation[]>(
    initialInvitations || [],
  );
  const [loading, setLoading] = useState(!initialInvitations);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getClientSessionToken();
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const res = await fetch(`/api/delegados/invitaciones/recibidas${search}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error('Error al cargar las invitaciones');
      }
      const data = await res.json();
      setInvitations(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudieron cargar las invitaciones';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialInvitations) {
      fetchInvitations();
    }
  }, [initialInvitations]);

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/delegados/invitaciones/${id}/aceptar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'No se pudo aceptar la invitación');
      }
      // Redirect to gestor dashboard where pending configuration is displayed
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al aceptar la invitación';
      alert(msg);
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas rechazar esta invitación?')) return;
    setProcessingId(id);
    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/delegados/invitaciones/${id}/rechazar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error('No se pudo rechazar la invitación');
      }
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al rechazar la invitación';
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div data-testid="invitation-inbox-loading" className="space-y-4 py-8">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
        <div className="h-28 w-full bg-slate-100 dark:bg-[#182747] animate-pulse rounded-xl border border-slate-200 dark:border-[#293956]" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="invitation-inbox-error"
        className="p-6 rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 my-4"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
        <button
          onClick={fetchInvitations}
          className="mt-3 px-4 py-2 min-h-[44px] min-w-[44px] text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div
        data-testid="empty-invitaciones"
        className="text-center py-12 px-4 rounded-xl border border-dashed border-[#D9D5CC] dark:border-[#293956] bg-white/50 dark:bg-[#182747]/40"
      >
        <Mail className="w-12 h-12 mx-auto text-[#B8BFCC] mb-3" />
        <h3 className="text-base font-semibold text-[#131F3C] dark:text-[#F5F3EE]">
          No tienes invitaciones pendientes
        </h3>
        <p className="text-xs text-[#667085] dark:text-[#AEB7C7] mt-1 max-w-sm mx-auto">
          Cuando un Gestor inmobiliario te invite a colaborar como Delegado en su espacio de trabajo, aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="invitation-inbox" className="space-y-4">
      {invitations.map((inv) => {
        const rawInv = inv as unknown as Record<string, unknown>;
        const expiresAt = inv.expiresAt || (rawInv.expiraEn as string) || Date.now();
        const isExpired = inv.estado === 'expirada' || new Date(expiresAt) < new Date();
        const gestorName = inv.gestorDisplayName || (rawInv.gestorNombre as string) || 'Gestor Inmobiliario';
        return (

          <div
            key={inv.id}
            data-testid={`invitation-item-${inv.id}`}
            className="p-5 rounded-xl border border-[#D9D5CC] dark:border-[#293956] bg-white dark:bg-[#182747] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#B89355]" />
                <span className="font-semibold text-sm text-[#131F3C] dark:text-[#F5F3EE]">
                  {gestorName}
                </span>
                {isExpired && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400">
                    Expirada
                  </span>
                )}
              </div>
              <p className="text-xs text-[#667085] dark:text-[#AEB7C7]">
                Te ha invitado a colaborar como Delegado en su espacio de gestión.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#AEB7C7] pt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Expira el {new Date(expiresAt).toLocaleDateString('es-AR')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 md:pt-0">
              <button
                data-testid="btn-rechazar-invitacion"
                onClick={() => handleReject(inv.id)}
                disabled={processingId === inv.id}
                className="px-4 py-2 min-h-[44px] min-w-[44px] text-xs font-semibold rounded-lg border border-rose-500/60 text-rose-600 dark:text-rose-200 bg-transparent dark:bg-rose-950/30 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Rechazar
              </button>
              <button
                data-testid="btn-aceptar-invitacion"
                onClick={() => handleAccept(inv.id)}
                disabled={processingId === inv.id || isExpired}
                className="px-4 py-2 min-h-[44px] min-w-[44px] text-xs font-bold rounded-lg bg-[#B89355] text-[#131F3C] hover:bg-[#9F783E] hover:text-[#0B1428] transition disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {processingId === inv.id ? 'Aceptando...' : 'Aceptar'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

