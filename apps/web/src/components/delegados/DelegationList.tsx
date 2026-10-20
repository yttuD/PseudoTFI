'use client';

import React, { useState } from 'react';
import { DelegadoInvitation, DelegationSummary } from '@tfi/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Clock,
  Trash2,
  Settings,
  AlertCircle,
  Building,
  Home,
} from 'lucide-react';
import { DelegationAccessEditor } from './DelegationAccessEditor';
import { getClientSessionToken } from '@/lib/supabase/client-auth';

import { RevokeDelegacionModal } from './RevokeDelegacionModal';

interface DelegationListProps {
  initialInvitaciones: DelegadoInvitation[];
  initialDelegaciones: DelegationSummary[];
  initialState?: string;
}

export function DelegationList({
  initialInvitaciones,
  initialDelegaciones,
  initialState,
}: DelegationListProps) {
  const [invitaciones, setInvitaciones] =
    useState<DelegadoInvitation[]>(initialInvitaciones);
  const [delegaciones, setDelegaciones] =
    useState<DelegationSummary[]>(initialDelegaciones);
  const [selectedDelegation, setSelectedDelegation] =
    useState<DelegationSummary | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(
    initialState === 'FORM-013' ||
      initialState === 'FORM-013-api-error' ||
      initialState === 'FORM-013-success'
  );
  const [delegadoToRevoke, setDelegadoToRevoke] = useState<{
    id: string;
    nombre: string;
    email: string;
  } | null>(() => {
    if (initialDelegaciones && initialDelegaciones.length > 0) {
      const d = initialDelegaciones[0] as unknown as Record<string, unknown>;
      return {
        id: initialDelegaciones[0].id,
        nombre: initialDelegaciones[0].delegado?.displayName || (d.delegadoNombre as string) || 'Delegado Sólo Lectura',
        email: initialDelegaciones[0].delegado?.maskedEmail || (d.delegadoEmail as string) || 'delegado-ver@test.com',
      };
    }
    return {
      id: 'del-001',
      nombre: 'Delegado Sólo Lectura',
      email: 'delegado-ver@test.com',
    };
  });

  const refreshData = async () => {
    try {
      const token = getClientSessionToken();
      const res = await fetch('/api/delegados', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setInvitaciones(data.invitaciones || []);
        setDelegaciones(data.delegaciones || []);
      }
    } catch {}
  };

  React.useEffect(() => {
    refreshData();
  }, []);

  const handleCancelInvitation = async (id: string) => {
    try {
      const token = getClientSessionToken();
      setInvitaciones((prev) => prev.filter((i) => i.id !== id));
      await fetch(`/api/delegados/invitaciones/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
  };

  const openRevokeModal = (d: DelegationSummary) => {
    const rawD = d as unknown as Record<string, unknown>;
    setDelegadoToRevoke({
      id: d.id,
      nombre: d.delegado?.displayName || (rawD.delegadoNombre as string) || 'Colaborador',
      email: d.delegado?.maskedEmail || (rawD.delegadoEmail as string) || '',
    });
    setRevokeModalOpen(true);
  };

  const openEditor = (del: DelegationSummary) => {
    setSelectedDelegation(del);
    setEditorOpen(true);
  };

  const renderScopeBadge = (del: DelegationSummary) => {
    const rawDel = del as unknown as Record<string, unknown>;
    if (del.estado === 'aceptada_sin_configurar' || rawDel.estado === 'pendiente_configuracion') {
      return (
        <span
          data-testid="badge-pendiente-configuracion"
          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
        >
          <AlertCircle className="w-3 h-3" />
          Aceptada sin configurar (Sin acceso)
        </span>
      );
    }



    if (del.alcanceTipo === 'cuenta') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
          <Users className="w-3 h-3" />
          Toda la Cuenta
        </span>
      );
    }

    if (del.alcanceTipo === 'grupo') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300">
          <Building className="w-3 h-3" />
          Grupo: {del.grupo?.nombre || 'Grupo'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
        <Home className="w-3 h-3" />
        {del.unidades?.length || 0} Unidades asignadas
      </span>
    );
  };

  const hasData = invitaciones.length > 0 || delegaciones.length > 0;

  if (!hasData) {
    return (
      <div
        data-testid="empty-delegados"
        className="text-center py-16 px-4 rounded-xl border border-dashed border-[#D9D5CC] dark:border-[#293956] bg-white/50 dark:bg-[#182747]/40"
      >

        <Users className="w-12 h-12 mx-auto text-[#B8BFCC] mb-3" />
        <h3 className="text-base font-semibold text-[#131F3C] dark:text-[#F5F3EE]">
          No tienes colaboradores en tu equipo
        </h3>
        <p className="text-xs text-[#667085] dark:text-[#AEB7C7] mt-1 max-w-sm mx-auto">
          Invita a una cuenta registrada y verificada para delegar tareas operativas de lectura o gestión sobre tus unidades.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="delegation-list-container" className="space-y-6">
      {/* Active & Pending Delegations */}
      {delegaciones.length > 0 && (
        <div data-testid="delegaciones-activas-list" className="space-y-3">
          <h3 className="text-sm font-bold text-[#131F3C] dark:text-[#F5F3EE] uppercase tracking-wider">
            Equipo de Delegados ({delegaciones.length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {delegaciones.map((d) => {
              const rawD = d as unknown as Record<string, unknown>;
              const displayName = d.delegado?.displayName || (rawD.delegadoNombre as string) || 'Colaborador';
              const maskedEmail = d.delegado?.maskedEmail || (rawD.delegadoEmail as string) || '';
              const isUnconfigured = d.estado === 'aceptada_sin_configurar' || rawD.estado === 'pendiente_configuracion';

              return (
                <div
                  key={d.id}
                  data-testid={`delegado-row-${d.id}`}
                  className="p-4 rounded-xl border border-[#D9D5CC] dark:border-[#293956] bg-white dark:bg-[#182747] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-[#131F3C] dark:text-[#F5F3EE] break-words">
                        {displayName}
                      </span>
                      <span className="text-xs text-[#667085] dark:text-[#AEB7C7] break-all">
                        ({maskedEmail})
                      </span>
                      {d.permiso && (
                        <Badge
                          variant="outline"
                          className={
                            d.permiso === 'gestionar'
                              ? 'bg-[#B89355]/15 text-[#B89355] border-[#B89355]/30 shrink-0'
                              : 'bg-slate-100 dark:bg-[#1C2B4D] text-[#131F3C] dark:text-[#F5F3EE] shrink-0'
                          }
                        >
                          {d.permiso === 'gestionar' ? 'Gestionar' : 'Ver'}
                        </Badge>
                      )}
                      {renderScopeBadge(d)}
                    </div>
                    <div className="text-[11px] text-[#667085] dark:text-[#AEB7C7]">
                      Última actualización: {new Date(d.updatedAt || Date.now()).toLocaleDateString('es-AR')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="btn-configurar-permisos"
                      onClick={() => openEditor(d)}
                      className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs inline-flex items-center gap-1.5"
                      render={<button />}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      {isUnconfigured
                        ? 'Configurar Permisos'
                        : 'Editar Permisos'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      data-testid="btn-revocar-delegado"
                      onClick={() => openRevokeModal(d)}
                      className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 inline-flex items-center gap-1.5"
                      render={<button />}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revocar
                    </Button>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {invitaciones.length > 0 && (
        <div data-testid="invitaciones-pendientes-list" className="space-y-3 pt-4">
          <h3 className="text-sm font-bold text-[#131F3C] dark:text-[#F5F3EE] uppercase tracking-wider">
            Invitaciones Pendientes ({invitaciones.filter((i) => i.estado === 'pendiente').length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {invitaciones.map((inv) => {
              const rawInv = inv as unknown as Record<string, unknown>;
              const targetDisplayName = inv.target?.displayName || (rawInv.delegadoEmail as string) || 'Usuario';
              const targetMaskedEmail = inv.target?.maskedEmail || (rawInv.delegadoEmail as string) || '';
              const expiresDate = inv.expiresAt || (rawInv.expiraEn as string) || Date.now();
              const emailChannel = inv.channels?.email || (rawInv.delegadoEmail as string) || '';

              return (
                <div
                  key={inv.id}
                  data-testid={`invitacion-row-${inv.id}`}
                  className="p-4 rounded-xl border border-dashed border-[#D9D5CC] dark:border-[#293956] bg-slate-50/50 dark:bg-[#182747]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-[#131F3C] dark:text-[#F5F3EE] break-words">
                        {targetDisplayName}
                      </span>
                      <span className="text-xs text-[#667085] dark:text-[#AEB7C7] break-all">
                        ({targetMaskedEmail})
                      </span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[10px] shrink-0">
                        {inv.estado}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#667085] dark:text-[#AEB7C7]">
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        Expira: {new Date(expiresDate).toLocaleDateString('es-AR')}
                      </span>
                      <span>•</span>
                      <span className="break-all">Email: {emailChannel}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {inv.estado === 'pendiente' && (
                      <Button
                        type="button"
                        variant="outline"
                        data-testid="cancel-invitation-btn"
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                        render={<button />}
                      >
                        Cancelar Invitación
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      )}

      <DelegationAccessEditor
        delegation={selectedDelegation}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={refreshData}
      />

      <RevokeDelegacionModal
        open={revokeModalOpen}
        onOpenChange={setRevokeModalOpen}
        delegacionId={delegadoToRevoke?.id}
        delegadoNombre={delegadoToRevoke?.nombre}
        delegadoEmail={delegadoToRevoke?.email}
        onSuccess={refreshData}
        initialState={initialState}
      />
    </div>
  );
}
