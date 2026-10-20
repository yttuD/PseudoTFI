'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { getClientAuthToken } from '@/lib/supabase/client-token';

interface DelegadoFormModalProps {
  token: string;
  onSuccess?: () => void;
  initialState?: string;
}

export default function DelegadoFormModal({ token, onSuccess, initialState }: DelegadoFormModalProps) {
  const [open, setOpen] = useState(
    initialState === 'FORM-007' ||
      initialState === 'FORM-007-validation-error' ||
      initialState === 'FORM-007-api-error' ||
      initialState === 'FORM-007-success'
  );
  const [email, setEmail] = useState(
    initialState === 'FORM-007-validation-error' ? 'correo-invalido' : ''
  );
  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState<'validation' | 'api' | null>(() => {
    if (initialState === 'FORM-007-validation-error') return 'validation';
    if (initialState === 'FORM-007-api-error') return 'api';
    return null;
  });
  const [error, setError] = useState<string | null>(() => {
    if (initialState === 'FORM-007-validation-error') return 'Por favor, ingresa un correo electrónico válido.';
    if (initialState === 'FORM-007-api-error') return 'Error de comunicación con el servicio de invitaciones. Por favor reintente.';
    return null;
  });
  const [success, setSuccess] = useState<string | null>(() => {
    if (initialState === 'FORM-007-success') return 'Invitación enviada con éxito a colaborador@ejemplo.com';
    return null;
  });
  const router = useRouter();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEmail('');
      setError(null);
      setErrorType(null);
      setSuccess(null);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorType(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorType('validation');
      setError('Por favor, ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);

    try {
      const effectiveToken = getClientAuthToken(token);
      const res = await fetch('/api/delegados/invitaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorType('api');
        throw new Error(data.message || 'Error al enviar la invitación');
      }

      setSuccess(`Invitación enviada con éxito a ${trimmedEmail}`);
      setEmail('');
      if (onSuccess) {
        onSuccess();
      }
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setErrorType('api');
      const msg = err instanceof Error ? err.message : 'No se pudo enviar la invitación';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button data-testid="btn-invitar-delegado" className="bg-[#B89355] text-white hover:bg-[#9F783E] min-h-[44px] min-w-[44px]" render={<button />} />}>
        <UserPlus className="w-4 h-4 mr-2" />
        + Invitar Delegado
      </DialogTrigger>
      <DialogContent data-testid="FORM-007" className="max-w-md">
        <div data-testid="modal-invitar-delegado" className="contents">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#131F3C] dark:text-[#F5F3EE]">
              Invitar Delegado
            </DialogTitle>
            <p className="text-xs text-[#667085] dark:text-[#AEB7C7]">
              Ingresa el correo electrónico de una cuenta registrada y verificada en Rendo.
            </p>
          </DialogHeader>

          {error && errorType === 'validation' && (
            <div
              data-testid="FORM-007-validation-error"
              className="p-3 text-xs rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="text-destructive font-medium">{error}</span>
            </div>
          )}

          {error && errorType === 'api' && (
            <div
              data-testid="FORM-007-api-error"
              className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 space-y-2"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                <span className="text-destructive font-medium">{error}</span>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onSubmit}
                  className="min-h-[44px] min-w-[44px] text-xs font-semibold"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}

        {success && (
          <div
            data-testid="FORM-007-success"
            className="p-3 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="delegado-email"
              className="text-xs font-semibold text-[#131F3C] dark:text-[#F5F3EE]"
            >
              Email del colaborador
            </label>
            <Input
              id="delegado-email"
              data-testid="input-delegado-email"
              type="email"
              name="email"
              placeholder="colaborador@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px]"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="min-h-[44px] min-w-[44px] px-4 py-2"
              render={<button />}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="btn-enviar-invitacion"
              disabled={loading}
              className="bg-[#B89355] text-white hover:bg-[#9F783E] min-h-[44px] min-w-[44px] px-4 py-2 font-semibold shadow-sm"
              render={<button />}
            >
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
