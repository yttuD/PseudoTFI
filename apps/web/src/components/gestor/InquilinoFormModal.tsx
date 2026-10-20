'use client';

import { useState, useEffect } from 'react';
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
import { Plus, UserPlus, Trash2, ShieldCheck, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const formSchema = z.object({
  nombre_completo: z.string().min(2, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  documento: z.string().optional().or(z.literal('')),
  documento_identidad: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

export interface GaranteData {
  nombre_completo: string;
  dni: string;
  telefono: string;
  email: string;
}

export interface InquilinoFormModalProps {
  token: string;
  onCreated?: (inquilino: { id: string; nombre_completo: string; email?: string }) => void;
  trigger?: React.ReactElement;
}

export function InquilinoFormModal({ token, onCreated, trigger }: InquilinoFormModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sección colapsable de Garantes
  const [showGarantesSection, setShowGarantesSection] = useState(false);
  const [garantes, setGarantes] = useState<GaranteData[]>([]);

  // Modal de Consentimiento Ley 25.326
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [consentInquilino, setConsentInquilino] = useState(false);
  const [consentGarantes, setConsentGarantes] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_completo: '',
      email: '',
      telefono: '',
      documento: '',
      documento_identidad: '',
    },
  });

  const handleAddGarante = () => {
    setGarantes((prev) => [
      ...prev,
      { nombre_completo: '', dni: '', telefono: '', email: '' },
    ]);
    setShowGarantesSection(true);
  };

  const handleUpdateGarante = (index: number, field: keyof GaranteData, val: string) => {
    setGarantes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveGarante = (index: number) => {
    setGarantes((prev) => prev.filter((_, i) => i !== index));
  };

  // Paso 1: Valida el form y abre el AlertDialog de Ley 25.326
  const handlePreSubmit = (data: FormData) => {
    setPendingFormData(data);
    setConsentInquilino(false);
    setConsentGarantes(false);
    setShowConsentModal(true);
  };

  // Paso 2: Ejecuta el guardado efectivo una vez aceptado el consentimiento
  const handleConfirmConsent = async () => {
    if (!pendingFormData) return;
    setIsSubmitting(true);

    try {
      const doc = pendingFormData.documento || pendingFormData.documento_identidad;
      const validGarantes = garantes.filter((g) => g.nombre_completo.trim().length > 0);

      const payload = {
        nombre_completo: pendingFormData.nombre_completo,
        ...(pendingFormData.email ? { email: pendingFormData.email } : {}),
        ...(pendingFormData.telefono ? { telefono: pendingFormData.telefono } : {}),
        ...(doc ? { documento: doc, documento_identidad: doc } : {}),
        garantes: validGarantes,
        consentimiento_ley25326: true,
        consentimiento_fecha: new Date().toISOString(),
      };

      const effectiveToken = getClientAuthToken(token);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inquilinos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Error al crear el inquilino (${res.status})`);
      }

      const created = await res.json();

      form.reset();
      setGarantes([]);
      setShowGarantesSection(false);
      setShowConsentModal(false);
      setOpen(false);

      if (onCreated && created?.id) {
        onCreated(created);
      } else {
        router.refresh();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Hubo un error al guardar el inquilino';
      setErrorMessage(msg);
      setShowConsentModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasGarantes = garantes.length > 0;
  const isConsentValid = consentInquilino && (!hasGarantes || consentGarantes);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErrorMessage(null); }}>
        <DialogTrigger
          render={
            trigger ? (
              trigger
            ) : (
              <Button
                data-testid="btn-nuevo-inquilino"
                disabled={!mounted}
                className="min-h-[44px]"
              >
                <Plus className="mr-2 h-4 w-4" /> Nuevo Inquilino
              </Button>
            )
          }
        />
        <DialogContent data-testid="FORM-004" className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>Nuevo Inquilino</DialogTitle>
            <DialogDescription>
              Cargá los datos del inquilino y sus garantes para la gestión locativa.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={form.handleSubmit(handlePreSubmit)} className="space-y-4 pt-1">
            {/* Datos Principales */}
            <div className="space-y-3">
              <div className="grid gap-1.5">
                <Label htmlFor="nombre_completo">Nombre Completo *</Label>
                <Input
                  id="nombre_completo"
                  {...form.register('nombre_completo')}
                  placeholder="Ej. Juan Pérez"
                />
                {form.formState.errors.nombre_completo && (
                  <span className="text-xs text-destructive">
                    {form.formState.errors.nombre_completo.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="documento">DNI / Documento</Label>
                  <Input
                    id="documento"
                    {...form.register('documento')}
                    placeholder="Ej. 34.567.890"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    {...form.register('telefono')}
                    placeholder="Ej. +54 9 3777 554433"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="juan.perez@ejemplo.com"
                />
                {form.formState.errors.email && (
                  <span className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </span>
                )}
              </div>
            </div>

            {/* Sección Garantes */}
            <div className="border border-border/70 rounded-xl p-3.5 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowGarantesSection(!showGarantesSection)}
                  className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors min-h-[44px]"
                >
                  <UserPlus className="h-4 w-4 text-primary" />
                  <span>Garantes ({garantes.length})</span>
                  {showGarantesSection ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddGarante}
                  className="min-h-[44px] text-xs px-3"
                >
                  <Plus className="h-3 w-3 mr-1" /> Añadir
                </Button>
              </div>

              {showGarantesSection && (
                <div className="space-y-3 pt-1">
                  {garantes.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No se han agregado garantes aún. Podés añadir uno o más de forma opcional.
                    </p>
                  ) : (
                    garantes.map((g, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-card border border-border/80 rounded-lg space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-muted-foreground">
                            GARANTE #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGarante(idx)}
                            className="text-muted-foreground hover:text-destructive transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg"
                            title="Eliminar garante"
                            aria-label={`Eliminar garante ${idx + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Nombre completo"
                            value={g.nombre_completo}
                            onChange={(e) => handleUpdateGarante(idx, 'nombre_completo', e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="DNI / CUIT"
                            value={g.dni}
                            onChange={(e) => handleUpdateGarante(idx, 'dni', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Teléfono"
                            value={g.telefono}
                            onChange={(e) => handleUpdateGarante(idx, 'telefono', e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Correo electrónico"
                            type="email"
                            value={g.email}
                            onChange={(e) => handleUpdateGarante(idx, 'email', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                Continuar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Obligatorio de Consentimiento Ley 25.326 */}
      <Dialog open={showConsentModal} onOpenChange={setShowConsentModal}>
        <DialogContent className="w-[95vw] max-w-md p-5 sm:p-6 overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShieldCheck className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">
                Consentimiento y Protección de Datos Personales
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Conforme al <strong>Art. 5 de la Ley Nacional N° 25.326</strong>, el tratamiento de datos personales requiere el consentimiento libre, expreso e informado del titular.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-3 text-xs">
            {/* Check 1: Inquilino Titular (Obligatorio) */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-card/60 cursor-pointer hover:bg-card transition-colors">
              <input
                type="checkbox"
                checked={consentInquilino}
                onChange={(e) => setConsentInquilino(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-foreground leading-snug">
                <strong>Declaro bajo juramento</strong> que el Inquilino titular ha otorgado su consentimiento expreso para que sus datos de contacto e identidad sean registrados en la plataforma Rendo con fines de gestión locativa.
              </span>
            </label>

            {/* Check 2: Garantes (Obligatorio si hay garantes) */}
            {hasGarantes && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-card/60 cursor-pointer hover:bg-card transition-colors">
                <input
                  type="checkbox"
                  checked={consentGarantes}
                  onChange={(e) => setConsentGarantes(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                />
                <span className="text-foreground leading-snug">
                  <strong>Declaro bajo juramento</strong> contar con la autorización y consentimiento expreso de los Garantes informados para el tratamiento de sus datos personales vinculados a este arrendamiento.
                </span>
              </label>
            )}

            {!isConsentValid && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-500/90 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Debés aceptar las declaraciones juradas obligatorias para continuar.</span>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConsentModal(false)}
              className="w-full sm:w-auto"
            >
              Volver
            </Button>
            <Button
              type="button"
              disabled={!isConsentValid || isSubmitting}
              onClick={handleConfirmConsent}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar y Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default InquilinoFormModal;
