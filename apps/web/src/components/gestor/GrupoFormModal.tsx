'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { getClientAuthToken } from '@/lib/supabase/client-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Wallet, AlertCircle } from 'lucide-react';

const formSchema = z.object({
  nombre: z.string().min(2, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  sena_default_activa: z.boolean(),
  sena_default_tipo: z.enum(['porcentaje', 'monto_fijo']),
  sena_default_valor: z.number().min(0, 'El valor no puede ser negativo'),
}).refine((data) => {
  if (data.sena_default_activa && data.sena_default_valor <= 0) {
    return false;
  }
  return true;
}, {
  message: 'El valor de la seña debe ser mayor a 0 cuando está activa',
  path: ['sena_default_valor'],
}).refine((data) => {
  if (data.sena_default_activa && data.sena_default_tipo === 'porcentaje') {
    return data.sena_default_valor <= 100;
  }
  return true;
}, {
  message: 'El porcentaje de seña no puede superar el 100%',
  path: ['sena_default_valor'],
});

type FormData = z.infer<typeof formSchema>;

export function GrupoFormModal({ token, trigger }: { token: string; trigger?: React.ReactElement }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      sena_default_activa: false,
      sena_default_tipo: 'porcentaje',
      sena_default_valor: 0,
    },
  });

  const senaActiva = form.watch('sena_default_activa');
  const senaTipo = form.watch('sena_default_tipo');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const effectiveToken = getClientAuthToken(token);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/grupos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({
          nombre: data.nombre,
          descripcion: data.descripcion || undefined,
          sena_default_activa: data.sena_default_activa,
          sena_default_tipo: data.sena_default_tipo,
          sena_default_valor: Number(data.sena_default_valor || 0),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Error al crear el grupo (${res.status})`);
      }

      form.reset();
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error inesperado al crear el grupo';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErrorMessage(null); }}>
      <DialogTrigger
        render={
          trigger ? (
            trigger
          ) : (
            <Button data-testid="btn-nuevo-grupo" className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Grupo
            </Button>
          )
        }
      />
      <DialogContent className="w-[95vw] max-w-[480px] max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>Nuevo Grupo</DialogTitle>
          <DialogDescription>
            Creá un grupo organizativo con configuración opcional de seña predeterminada.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre del Grupo *</Label>
            <Input
              id="nombre"
              {...form.register('nombre')}
              placeholder="Ej. Edificio Libertador"
            />
            {form.formState.errors.nombre && (
              <span className="text-xs text-destructive">
                {form.formState.errors.nombre.message}
              </span>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descripcion">Descripción (Opcional)</Label>
            <Input
              id="descripcion"
              {...form.register('descripcion')}
              placeholder="Ej. Torre residencial con 12 departamentos"
            />
          </div>

          {/* Configuración de Seña por Defecto */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="sena_default_activa" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                <Wallet className="h-3.5 w-3.5 text-amber-500" />
                <span>Configurar Seña Predeterminada</span>
              </Label>
              <input
                id="sena_default_activa"
                type="checkbox"
                {...form.register('sena_default_activa')}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Las unidades asignadas a este grupo podrán heredar esta seña automáticamente al crear un nuevo alquiler.
            </p>

            {senaActiva && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="sena_default_tipo" className="text-[11px]">Tipo de Seña</Label>
                    <select
                      id="sena_default_tipo"
                      {...form.register('sena_default_tipo')}
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="porcentaje">Porcentaje (%)</option>
                      <option value="monto_fijo">Monto Fijo ($ ARS)</option>
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="sena_default_valor" className="text-[11px]">
                      {senaTipo === 'porcentaje' ? 'Porcentaje (0–100%)' : 'Monto ($ ARS)'} *
                    </Label>
                    <Input
                      id="sena_default_valor"
                      data-testid="grupo-sena-default"
                      type="number"
                      min={senaActiva ? 1 : 0}
                      max={senaTipo === 'porcentaje' ? 100 : undefined}
                      step="any"
                      {...form.register('sena_default_valor', { valueAsNumber: true })}
                      placeholder={senaTipo === 'porcentaje' ? '20' : '50000'}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {form.formState.errors.sena_default_valor && (
                  <span data-testid="grupo-sena-error" className="text-xs text-destructive block">
                    {form.formState.errors.sena_default_valor.message}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto min-h-[44px]">
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default GrupoFormModal;
