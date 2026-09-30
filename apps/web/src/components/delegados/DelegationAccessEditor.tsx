'use client';

import React, { useState, useEffect } from 'react';
import {
  DelegationSummary,
  DelegationPermission,
  DelegationScopeType,
} from '@tfi/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Building, Home, AlertTriangle, Search } from 'lucide-react';
import { getClientSessionToken } from '@/lib/supabase/client-auth';

interface AccessEditorProps {
  delegation: DelegationSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function DelegationAccessEditor({
  delegation,
  open,
  onOpenChange,
  onSaved,
}: AccessEditorProps) {
  const [permiso, setPermiso] = useState<DelegationPermission>('ver');
  const [alcanceTipo, setAlcanceTipo] = useState<DelegationScopeType>('cuenta');
  const [grupoId, setGrupoId] = useState<string>('');
  const [selectedUnidadIds, setSelectedUnidadIds] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [unidades, setUnidades] = useState<Array<{ id: string; titulo_es?: string; titulo?: string }>>([]);
  const [unitSearch, setUnitSearch] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (delegation) {
      setPermiso(delegation.permiso || 'ver');
      setAlcanceTipo(delegation.alcanceTipo || 'cuenta');
      setGrupoId(delegation.grupo?.id || '');
      setSelectedUnidadIds(delegation.unidades?.map((u) => u.id) || []);
      setConfirmStep(false);
      setError(null);
    }
  }, [delegation]);

  // Load Gestor groups and units for selection
  useEffect(() => {
    if (!open) return;
    const token = getClientSessionToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/grupos', { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGrupos(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch('/api/unidades?limit=500', { headers })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => setUnidades(data.data || []))
      .catch(() => {});
  }, [open]);

  if (!delegation) return null;

  const handleToggleUnit = (unitId: string) => {
    setSelectedUnidadIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId],
    );
  };

  const filteredUnits = unidades.filter((u) => {
    const title = u.titulo_es || u.titulo || '';
    return title.toLowerCase().includes(unitSearch.toLowerCase());
  });

  const handleSave = async () => {
    setError(null);
    if (alcanceTipo === 'grupo' && !grupoId) {
      setError('Debes seleccionar un Grupo');
      return;
    }
    if (alcanceTipo === 'unidades' && selectedUnidadIds.length === 0) {
      setError('Debes seleccionar al menos una Unidad');
      return;
    }

    setLoading(true);
    try {
      const token = getClientSessionToken();
      const payload: Record<string, unknown> = {
        permiso,
        alcanceTipo,
      };
      if (alcanceTipo === 'grupo') payload.grupoId = grupoId;
      if (alcanceTipo === 'unidades') payload.unidadIds = selectedUnidadIds;

      const res = await fetch(`/api/delegados/${delegation.id}/configuracion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar la configuración');
      }

      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la configuración';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getScopeDescription = () => {
    if (alcanceTipo === 'cuenta') {
      return `Toda la cuenta del Gestor (${permiso === 'gestionar' ? 'Gestión operativa completa' : 'Sólo lectura de todas las unidades'})`;
    }
    if (alcanceTipo === 'grupo') {
      const g = grupos.find((gr) => gr.id === grupoId);
      return `Grupo "${g?.nombre || 'Seleccionado'}" (${permiso === 'gestionar' ? 'Gestión de miembros y creación directa' : 'Sólo lectura'})`;
    }
    return `${selectedUnidadIds.length} Unidades específicas (${permiso === 'gestionar' ? 'Gestión operativa de unidades seleccionadas' : 'Sólo lectura'})`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="modal-configuracion-delegado" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#131F3C] dark:text-[#F5F3EE]">
            Configurar Permisos de {delegation.delegado?.displayName || ((delegation as unknown as Record<string, unknown>).delegadoNombre as string) || 'Colaborador'}
          </DialogTitle>

          <p className="text-xs text-[#475467] dark:text-[#AEB7C7]">
            Define el alcance territorial y nivel de autorización asignado a este colaborador.
          </p>
        </DialogHeader>

        {error && (
          <div
            data-testid="access-editor-error"
            className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          >
            {error}
          </div>
        )}

        {!confirmStep ? (
          <div className="space-y-6 pt-2">
            {/* 1. Nivel de Permiso */}
            <div>
              <label className="text-sm font-semibold text-[#131F3C] dark:text-[#F5F3EE] block mb-2">
                1. Nivel de Permiso
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="radio-permiso-ver"
                  onClick={() => setPermiso('ver')}
                  className={`p-4 rounded-xl border text-left transition min-h-[44px] ${
                    permiso === 'ver'
                      ? 'border-[#B89355] bg-[#B89355]/15 ring-1 ring-[#B89355]'
                      : 'border-[#D9D5CC] dark:border-[#293956] bg-white dark:bg-[#0B1428] hover:bg-slate-50 dark:hover:bg-[#182747]'
                  }`}
                >
                  <div className="font-semibold text-sm text-[#131F3C] dark:text-[#F5F3EE]">
                    Ver (Sólo lectura)
                  </div>
                  <p className="text-xs text-[#475467] dark:text-[#AEB7C7] mt-1">
                    Puede consultar información de unidades, alquileres e inquilinos dentro de su alcance sin poder modificar nada.
                  </p>
                </button>

                <button
                  type="button"
                  data-testid="radio-permiso-gestionar"
                  onClick={() => setPermiso('gestionar')}
                  className={`p-4 rounded-xl border text-left transition min-h-[44px] ${
                    permiso === 'gestionar'
                      ? 'border-[#B89355] bg-[#B89355]/15 ring-1 ring-[#B89355]'
                      : 'border-[#D9D5CC] dark:border-[#293956] bg-white dark:bg-[#0B1428] hover:bg-slate-50 dark:hover:bg-[#182747]'
                  }`}
                >
                  <div className="font-semibold text-sm text-[#131F3C] dark:text-[#F5F3EE]">
                    Gestionar (Operativo)
                  </div>
                  <p className="text-xs text-[#475467] dark:text-[#AEB7C7] mt-1">
                    Crea y edita alquileres, disponibilidad e inquilinos dentro del alcance asignado. Nunca accede a datos sensibles del Gestor.
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Alcance de Acceso */}
            <div>
              <label className="text-sm font-semibold text-[#131F3C] dark:text-[#F5F3EE] block mb-2">
                2. Alcance de Acceso
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  data-testid="radio-alcance-cuenta"
                  onClick={() => setAlcanceTipo('cuenta')}
                  className={`p-3 rounded-lg border text-center transition min-h-[44px] ${
                    alcanceTipo === 'cuenta'
                      ? 'border-[#B89355] bg-[#B89355]/20 font-bold text-[#B89355] dark:text-[#D2AD68]'
                      : 'border-[#D9D5CC] dark:border-[#293956] bg-white dark:bg-[#0B1428] text-[#131F3C] dark:text-[#F5F3EE]'
                  }`}
                >
                  <Users className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-xs">Toda la Cuenta</span>
                </button>

                <button
                  type="button"
                  data-testid="radio-alcance-grupo"
                  onClick={() => setAlcanceTipo('grupo')}
                  className={`p-3 rounded-lg border text-center transition min-h-[44px] ${
                    alcanceTipo === 'grupo'
                      ? 'border-[#B89355] bg-[#B89355]/20 font-bold text-[#B89355] dark:text-[#D2AD68]'
                      : 'border-[#D9D5CC] dark:border-[#293956] bg-white dark:bg-[#0B1428] text-[#131F3C] dark:text-[#F5F3EE]'
                  }`}
                >
                  <Building className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-xs">Un Grupo</span>
                </button>

                <button
                  type="button"
                  data-testid="radio-alcance-unidades"
                  onClick={() => setAlcanceTipo('unidades')}
                  className={`p-3 rounded-lg border text-center transition min-h-[44px] ${
                    alcanceTipo === 'unidades'
                      ? 'border-[#B89355] bg-[#B89355]/20 font-bold text-[#B89355] dark:text-[#D2AD68]'
                      : 'border-[#D9D5CC] dark:border-[#293956] bg-white dark:bg-[#0B1428] text-[#131F3C] dark:text-[#F5F3EE]'
                  }`}
                >
                  <Home className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-xs">Unidades Específicas</span>
                </button>
              </div>
              <div data-testid="editor-scope-summary" className="p-3 mt-3 rounded-lg bg-slate-100 dark:bg-[#182747] border border-[#D9D5CC] dark:border-[#293956] text-xs font-semibold text-[#131F3C] dark:text-[#F5F3EE] shadow-xs">
                {getScopeDescription()}
              </div>
            </div>

            {/* Target Selectors */}
            {alcanceTipo === 'grupo' && (
              <div data-testid="select-grupo" className="space-y-2 p-3 bg-slate-100 dark:bg-[#182747] rounded-lg border border-[#D9D5CC] dark:border-[#293956]">
                <label className="text-xs font-semibold text-[#131F3C] dark:text-[#F5F3EE]">Seleccionar Grupo:</label>
                <select
                  data-testid="select-grupo-input"
                  value={grupoId}
                  onChange={(e) => setGrupoId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#D9D5CC] dark:border-[#293956] bg-white dark:bg-[#0B1428] text-sm text-[#131F3C] dark:text-[#F5F3EE] min-h-[44px]"
                >
                  <option value="">-- Elige un grupo --</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {alcanceTipo === 'unidades' && (
              <div data-testid="unidades-selector" className="space-y-3 p-3 bg-slate-100 dark:bg-[#182747] rounded-lg border border-[#D9D5CC] dark:border-[#293956]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#131F3C] dark:text-[#F5F3EE]">
                    Seleccionar Unidades ({selectedUnidadIds.length} seleccionadas):
                  </label>
                  {selectedUnidadIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUnidadIds([])}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline min-h-[44px] inline-flex items-center px-2"
                    >
                      Deseleccionar todas
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    data-testid="input-search-unidades"
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    className="pl-9 min-h-[44px] border-[#D9D5CC] dark:border-[#293956] bg-white dark:bg-[#0B1428] text-[#131F3C] dark:text-[#F5F3EE]"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredUnits.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-[#AEB7C7] py-3 text-center">
                      No se encontraron unidades
                    </p>
                  ) : (
                    filteredUnits.map((u) => {
                      const isSelected = selectedUnidadIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs transition min-h-[44px] ${
                            isSelected
                              ? 'bg-[#B89355]/25 font-semibold text-[#131F3C] dark:text-[#F5F3EE]'
                              : 'hover:bg-slate-200/60 dark:hover:bg-[#182747] text-[#131F3C] dark:text-[#AEB7C7]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            data-testid="unit-selection-checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleUnit(u.id)}
                            className="rounded text-[#B89355] focus:ring-[#B89355] w-6 h-6 min-w-[24px] min-h-[24px] cursor-pointer"
                          />
                          <span>{u.titulo_es || u.titulo || 'Unidad sin título'}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#D9D5CC] dark:border-[#293956] sticky bottom-0 bg-[#FBFAF9] dark:bg-[#131F3C] py-3 pb-5 z-20">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 border-[#D9D5CC] dark:border-[#293956] text-[#131F3C] dark:text-[#F5F3EE] hover:bg-[#EEEAE1] dark:hover:bg-[#182747]"
                render={<button />}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                data-testid="review-access-btn"
                onClick={() => setConfirmStep(true)}
                className="bg-[#B89355] text-white hover:bg-[#9F783E] min-h-[44px] min-w-[44px] px-4 py-2 font-semibold shadow-sm"
                render={<button />}
              >
                Revisar y Confirmar
              </Button>
            </div>
          </div>
        ) : (
          <div data-testid="confirmation-step" className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">Confirmar Reemplazo de Permisos</h4>
                  <p className="text-xs text-amber-900/90 dark:text-amber-200/90">
                    Esta acción reemplazará atómicamente la configuración actual de{' '}
                    <strong className="underline">{delegation.delegado?.displayName || ((delegation as unknown as Record<string, unknown>).delegadoNombre as string) || 'Colaborador'}</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#D9D5CC] dark:border-[#293956] bg-slate-100 dark:bg-[#182747] space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-[#AEB7C7]">Resumen del nuevo alcance:</div>
              <div className="font-bold text-sm text-[#131F3C] dark:text-[#F5F3EE]">
                {getScopeDescription()}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#D9D5CC] dark:border-[#293956] sticky bottom-0 bg-[#FBFAF9] dark:bg-[#131F3C] py-3 pb-5 z-20">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmStep(false)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 border-[#D9D5CC] dark:border-[#293956] text-[#131F3C] dark:text-[#F5F3EE] hover:bg-[#EEEAE1] dark:hover:bg-[#182747]"
                render={<button />}
              >
                Volver a editar
              </Button>
              <Button
                type="button"
                data-testid="confirm-save-access-btn"
                onClick={handleSave}
                disabled={loading}
                className="bg-[#B89355] text-white hover:bg-[#9F783E] min-h-[44px] min-w-[44px] px-4 py-2 font-semibold shadow-sm"
                render={<button />}
              >
                {loading ? 'Guardando...' : 'Confirmar y Guardar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
