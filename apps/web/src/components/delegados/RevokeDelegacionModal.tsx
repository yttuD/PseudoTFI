'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getClientSessionToken } from '@/lib/supabase/client-auth';

interface RevokeDelegacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delegacionId?: string | null;
  delegadoNombre?: string | null;
  delegadoEmail?: string | null;
  onSuccess?: () => void;
  initialState?: string;
}

export function RevokeDelegacionModal({
  open,
  onOpenChange,
  delegacionId,
  delegadoNombre,
  delegadoEmail,
  onSuccess,
  initialState,
}: RevokeDelegacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (initialState === 'FORM-013-api-error' || initialState === 'api-error') {
      return 'Error de conexión con el servicio de revocación. La sesión del colaborador permanece activa.';
    }
    return null;
  });
  const [success, setSuccess] = useState<boolean>(() => {
    return initialState === 'FORM-013-success' || initialState === 'success';
  });

  useEffect(() => {
    if (initialState === 'FORM-013-api-error' || initialState === 'api-error') {
      setError('Error de conexión con el servicio de revocación. La sesión del colaborador permanece activa.');
    } else if (initialState === 'FORM-013-success' || initialState === 'success') {
      setSuccess(true);
    }
  }, [initialState]);

  const handleRevoke = async () => {
    if (!delegacionId) {
      setError('Identificador de delegación no válido.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = getClientSessionToken();
      const res = await fetch(`/api/delegados/${delegacionId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al revocar acceso del delegado.');
      }

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la revocación.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  const displayName = delegadoNombre || 'Colaborador';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="FORM-013" className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#131F3C] dark:text-[#F5F3EE]">
                Revocar Acceso de Delegado
              </DialogTitle>
              <DialogDescription className="text-xs text-[#667085] dark:text-[#AEB7C7] mt-0.5">
                Confirmación de remoción inmediata de privilegios operativos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div
            data-testid="FORM-013-api-error"
            className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2"
          >
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRevoke}
                disabled={loading}
                className="min-h-[44px] min-w-[44px] text-xs font-semibold"
              >
                Reintentar Revocación
              </Button>
            </div>
          </div>
        )}

        {success && (
          <div
            data-testid="FORM-013-success"
            className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 font-medium"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              Acceso revocado con éxito. La próxima solicitud del delegado será rechazada automáticamente por el servidor.
            </span>
          </div>
        )}

        {!success && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-xl border border-[#D9D5CC] dark:border-[#293956] bg-slate-50 dark:bg-[#182747]/40 text-xs space-y-1.5">
              <div className="font-semibold text-[#131F3C] dark:text-[#F5F3EE]">
                Delegado objetivo:
              </div>
              <div className="text-foreground dark:text-[#F5F3EE] font-medium break-all">
                {displayName} {delegadoEmail ? `(${delegadoEmail})` : ''}
              </div>
              <p className="text-[#667085] dark:text-[#AEB7C7] text-[11px] leading-relaxed pt-1">
                ⚠️ <strong>Efecto inmediato:</strong> Al confirmar, se eliminará el registro de delegación y se invalidará cualquier autorización concedida. Toda acción posterior responderá con 403 Forbidden.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                data-testid="btn-confirmar-revocacion"
                onClick={handleRevoke}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold shadow-sm inline-flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {loading ? 'Revocando...' : 'Confirmar Revocación'}
              </Button>
            </div>
          </div>
        )}

        {success && (
          <div className="flex justify-end pt-3">
            <Button
              type="button"
              onClick={handleClose}
              className="min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold"
            >
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
