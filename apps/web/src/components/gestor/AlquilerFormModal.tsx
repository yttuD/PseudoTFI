'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { getClientAuthToken } from '@/lib/supabase/client-token';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { InquilinoFormModal } from '@/components/gestor/InquilinoFormModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  FileText,
  UploadCloud,
  X,
  AlertCircle,
  Wallet,
  ShieldCheck,
  ArrowRightLeft,
  DollarSign,
  Clock,
  Calendar,
  Layers,
} from 'lucide-react';
import type { RentalModality } from '@tfi/types';

const formSchema = z
  .object({
    unidad_id: z.string().min(1, 'Seleccione una unidad'),
    inquilino_id: z.string().min(1, 'Seleccione un inquilino'),
    modalidad: z.enum(['mensual', 'diaria', 'por_hora'], {
      message: 'La modalidad es requerida',
    }),
    fecha_inicio: z.date({
      message: 'La fecha de inicio es requerida',
    }),
    fecha_fin: z.date({
      message: 'La fecha de fin es requerida',
    }),
    hora_inicio: z.string().optional(),
    hora_fin: z.string().optional(),
    monto_total: z.number().min(0.01, 'El monto total debe ser mayor a 0'),
    sena_eleccion: z.enum(['sin_sena', 'heredar_grupo', 'personalizada']),
    sena_tipo: z.enum(['porcentaje', 'monto_fijo']).optional(),
    sena_valor: z.number().optional(),
    monto_sena: z.number().min(0, 'La seña no puede ser negativa').optional(),
    monto_deposito: z.number().min(0, 'El depósito no puede ser negativo').optional(),
    estado_pago: z.enum(['cobrado_total', 'seña_cobrada', 'pendiente']),
    observaciones: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.modalidad === 'por_hora') {
        if (!data.hora_inicio || !data.hora_fin) return false;
        return true;
      }
      return data.fecha_fin >= data.fecha_inicio;
    },
    {
      message: 'La fecha de fin no puede ser anterior a la de inicio',
      path: ['fecha_fin'],
    },
  )
  .refine(
    (data) => {
      if (data.sena_eleccion === 'personalizada') {
        if (!data.sena_tipo) return false;
        if (data.sena_valor === undefined || data.sena_valor === null || isNaN(data.sena_valor) || data.sena_valor <= 0) {
          return false;
        }
        if (data.sena_tipo === 'porcentaje' && data.sena_valor > 100) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'El valor de la seña debe ser mayor a 0 (y hasta 100% si es porcentaje)',
      path: ['sena_valor'],
    },
  )
  .refine(
    (data) => {
      if (data.sena_eleccion === 'personalizada' && data.sena_tipo === 'monto_fijo') {
        const val = data.sena_valor || 0;
        const total = data.monto_total || 0;
        if (val > total && total > 0) return false;
      }
      const sena = data.monto_sena || 0;
      const total = data.monto_total || 0;
      if (sena > 0 && total > 0) {
        return sena <= total;
      }
      return true;
    },
    {
      message: 'La seña no puede superar el monto total acordado',
      path: ['sena_valor'],
    },
  );

type FormData = z.infer<typeof formSchema>;

export interface UnidadOption {
  id: string;
  titulo_es?: string;
  categoria?: string;
  grupo_id?: string | null;
  modalidades_precio?: Array<{
    id?: string;
    unidad_tiempo: string;
    cantidad_tiempo?: number;
    precio?: number;
  }>;
}

export interface InquilinoOption {
  id: string;
  nombre_completo: string;
  email?: string;
  documento?: string;
}

export interface GrupoOption {
  id: string;
  nombre: string;
  sena_default_activa?: boolean;
  sena_default_tipo?: 'porcentaje' | 'monto_fijo';
  sena_default_valor?: number;
  sena_porcentaje?: number;
  sena_default?: number;
}

export interface AlquilerFormModalProps {
  token: string;
  unidades: UnidadOption[];
  inquilinos: InquilinoOption[];
  grupos?: GrupoOption[];
}

export function AlquilerFormModal({
  token,
  unidades,
  inquilinos,
  grupos = [],
}: AlquilerFormModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const [unidadesList, setUnidadesList] = useState<UnidadOption[]>(unidades);
  const [inquilinosList, setInquilinosList] = useState<InquilinoOption[]>(inquilinos);
  const [gruposList, setGruposList] = useState<GrupoOption[]>(grupos);

  // Estado para el archivo PDF del contrato
  const [contratoFile, setContratoFile] = useState<File | null>(null);
  const [contratoError, setContratoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unidad_id: unidades[0]?.id || '',
      inquilino_id: inquilinos[0]?.id || '',
      modalidad: 'mensual',
      fecha_inicio: new Date(),
      fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      hora_inicio: '10:00',
      hora_fin: '14:00',
      monto_total: 100000,
      sena_eleccion: 'sin_sena',
      sena_tipo: 'monto_fijo',
      sena_valor: 0,
      monto_sena: 0,
      monto_deposito: 0,
      estado_pago: 'pendiente',
      observaciones: '',
    },
  });

  const watchedModalidad = form.watch('modalidad');
  const watchedUnidadId = form.watch('unidad_id');
  const watchedTotal = form.watch('monto_total') || 0;
  const watchedSena = form.watch('monto_sena') || 0;
  const watchedDeposito = form.watch('monto_deposito') || 0;
  const watchedEstadoPago = form.watch('estado_pago');
  const watchedSenaEleccion = form.watch('sena_eleccion');
  const watchedSenaTipo = form.watch('sena_tipo');
  const watchedSenaValor = form.watch('sena_valor');

  // Buscar unidad seleccionada
  const selectedUnidad = useMemo(() => {
    return unidadesList.find((u) => u.id === watchedUnidadId) || null;
  }, [unidadesList, watchedUnidadId]);

  // Resolver UNICAMENTE el grupo de la unidad seleccionada (nunca inventar ni caer al primero)
  const selectedGrupo = useMemo(() => {
    if (!selectedUnidad?.grupo_id) {
      return null;
    }
    return gruposList.find((g) => g.id === selectedUnidad.grupo_id) || null;
  }, [selectedUnidad, gruposList]);

  // Disponibilidad estricta de seña por defecto del grupo
  const isGrupoDefaultAvailable = useMemo(() => {
    if (!selectedGrupo || !selectedGrupo.sena_default_activa) return false;
    const valor = Number(selectedGrupo.sena_default_valor ?? selectedGrupo.sena_porcentaje ?? 0);
    if (valor <= 0) return false;
    const tipo = selectedGrupo.sena_default_tipo || 'porcentaje';
    if (tipo === 'porcentaje' && valor > 100) return false;
    return true;
  }, [selectedGrupo]);

  // Si la unidad cambia y ya no hay grupo válido disponible, pasar a sin_sena de forma segura
  useEffect(() => {
    if (form.getValues('sena_eleccion') === 'heredar_grupo' && !isGrupoDefaultAvailable) {
      form.setValue('sena_eleccion', 'sin_sena');
      form.setValue('sena_tipo', 'monto_fijo');
      form.setValue('sena_valor', 0);
      form.setValue('monto_sena', 0);
    }
  }, [isGrupoDefaultAvailable, watchedUnidadId, form]);

  // Mantener sincronizado monto_sena cuando cambia el total del contrato
  useEffect(() => {
    const eleccion = form.getValues('sena_eleccion');
    if (eleccion === 'heredar_grupo' && selectedGrupo && isGrupoDefaultAvailable) {
      const tipo = selectedGrupo.sena_default_tipo || 'porcentaje';
      const val = Number(selectedGrupo.sena_default_valor ?? selectedGrupo.sena_porcentaje ?? 0);
      const calculated = tipo === 'porcentaje' ? Math.round((watchedTotal * val) / 100) : val;
      form.setValue('monto_sena', calculated);
    } else if (eleccion === 'personalizada') {
      const tipo = form.getValues('sena_tipo');
      const val = Number(form.getValues('sena_valor') || 0);
      if (tipo === 'porcentaje') {
        form.setValue('monto_sena', Math.round((watchedTotal * val) / 100));
      } else {
        form.setValue('monto_sena', val);
      }
    }
  }, [watchedTotal, selectedGrupo, isGrupoDefaultAvailable, form]);

  // Cargar grupos si no vinieron en props
  useEffect(() => {
    if (grupos.length > 0) {
      setGruposList(grupos);
    } else {
      const effectiveToken = getClientAuthToken(token);
      const headers: Record<string, string> = {};
      if (effectiveToken) headers.Authorization = `Bearer ${effectiveToken}`;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      fetch(`${apiUrl}/grupos`, { headers })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setGruposList(data);
        })
        .catch(() => {});
    }
  }, [grupos, token]);

  // Sincronizar unidades si vienen vacías
  useEffect(() => {
    if (unidades.length > 0) {
      setUnidadesList(unidades);
    } else {
      const effectiveToken = getClientAuthToken(token);
      const headers: Record<string, string> = {};
      if (effectiveToken) headers.Authorization = `Bearer ${effectiveToken}`;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      fetch(`${apiUrl}/unidades?limit=1000`, { headers })
        .then((r) => r.json())
        .then((json) => {
          if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
            setUnidadesList(json.data);
            if (!form.getValues('unidad_id')) {
              form.setValue('unidad_id', json.data[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [unidades, token, form]);

  // Sincronizar inquilinos si vienen vacíos
  useEffect(() => {
    if (inquilinos.length > 0) {
      setInquilinosList(inquilinos);
    } else {
      const effectiveToken = getClientAuthToken(token);
      const headers: Record<string, string> = {};
      if (effectiveToken) headers.Authorization = `Bearer ${effectiveToken}`;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      fetch(`${apiUrl}/inquilinos?limit=1000`, { headers })
        .then((r) => r.json())
        .then((json) => {
          if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
            setInquilinosList(json.data);
            if (!form.getValues('inquilino_id')) {
              form.setValue('inquilino_id', json.data[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [inquilinos, token, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSuccessMessage(null);
      setApiErrorMessage(null);
    }
  };

  // Cambio de modalidad con ajuste dinámico de fechas/tiempos
  const handleModalityChange = (newMod: RentalModality) => {
    form.setValue('modalidad', newMod);
    const now = new Date();
    if (newMod === 'mensual') {
      form.setValue('fecha_inicio', now);
      form.setValue('fecha_fin', new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
    } else if (newMod === 'diaria') {
      form.setValue('fecha_inicio', now);
      form.setValue('fecha_fin', new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));
    } else if (newMod === 'por_hora') {
      form.setValue('fecha_inicio', now);
      form.setValue('fecha_fin', now);
      form.setValue('hora_inicio', '10:00');
      form.setValue('hora_fin', '14:00');
    }
  };

  // Cálculo de caja
  let cobradoInicial = 0;
  if (watchedEstadoPago === 'cobrado_total') {
    cobradoInicial = watchedTotal;
  } else if (watchedEstadoPago === 'seña_cobrada') {
    cobradoInicial = watchedSena;
  } else {
    cobradoInicial = 0;
  }
  const saldoPendiente = Math.max(0, watchedTotal - cobradoInicial);
  const fondosCustodia = watchedDeposito;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setContratoError(null);
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setContratoError('Solo se permiten archivos en formato PDF (.pdf)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setContratoError('El archivo excede el límite máximo de 10 MB');
      return;
    }
    setContratoFile(file);
  };

  const handleRemoveFile = () => {
    setContratoFile(null);
    setContratoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setContratoError(null);
    setApiErrorMessage(null);

    try {
      let contratoUrl: string | undefined = undefined;

      // 1. Subida opcional de archivo PDF
      if (contratoFile) {
        try {
          const supabase = createClient();
          const cleanName = contratoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = `${Date.now()}_${cleanName}`;
          const { data: uploadData } = await supabase.storage
            .from('contratos')
            .upload(filePath, contratoFile, { cacheControl: '3600', upsert: false });
          if (uploadData?.path) {
            const { data: pubData } = supabase.storage.from('contratos').getPublicUrl(uploadData.path);
            contratoUrl = pubData?.publicUrl || uploadData.path;
          }
        } catch {}
      }

      // 2. Construcción de intervalos según modalidad
      let inicioAtStr: string;
      let finAtStr: string;

      if (data.modalidad === 'por_hora') {
        const dStr = data.fecha_inicio.toISOString().split('T')[0];
        const hStart = data.hora_inicio || '10:00';
        const hEnd = data.hora_fin || '14:00';

        // Canonical America/Argentina/Buenos_Aires (UTC-3)
        const [sy, sm, sd] = dStr.split('-').map(Number);
        const [sh, smin] = hStart.split(':').map(Number);
        const [eh, emin] = hEnd.split(':').map(Number);

        // Si la hora de fin es menor a la de inicio, cruza medianoche
        const isCrossMidnight = eh < sh || (eh === sh && emin <= smin);
        const startUtc = new Date(Date.UTC(sy, sm - 1, sd, sh + 3, smin, 0));
        const endUtc = new Date(Date.UTC(sy, sm - 1, isCrossMidnight ? sd + 1 : sd, eh + 3, emin, 0));

        inicioAtStr = startUtc.toISOString();
        finAtStr = endUtc.toISOString();
      } else {
        inicioAtStr = data.fecha_inicio.toISOString();
        finAtStr = data.fecha_fin.toISOString();
      }

      // 3. Preparación de payload de seña coherente y verídico
      let senaTipoPayload: 'porcentaje' | 'monto_fijo' | null = null;
      let senaValorPayload: number | null = null;
      let montoSenaPayload = 0;

      if (data.sena_eleccion === 'personalizada') {
        senaTipoPayload = data.sena_tipo || 'monto_fijo';
        senaValorPayload = Number(data.sena_valor || 0);
        montoSenaPayload = senaTipoPayload === 'porcentaje'
          ? Math.round((Number(data.monto_total) * senaValorPayload) / 100)
          : senaValorPayload;
      } else if (data.sena_eleccion === 'heredar_grupo') {
        senaTipoPayload = null;
        senaValorPayload = null;
        if (selectedGrupo && isGrupoDefaultAvailable) {
          const tipo = selectedGrupo.sena_default_tipo || 'porcentaje';
          const val = Number(selectedGrupo.sena_default_valor ?? selectedGrupo.sena_porcentaje ?? 0);
          montoSenaPayload = tipo === 'porcentaje'
            ? Math.round((Number(data.monto_total) * val) / 100)
            : val;
        }
      } else {
        // sin_sena
        senaTipoPayload = null;
        senaValorPayload = null;
        montoSenaPayload = 0;
      }

      // 4. Envío a API
      const effectiveToken = getClientAuthToken(token);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alquileres`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({
          unidad_id: data.unidad_id,
          inquilino_id: data.inquilino_id,
          modalidad: data.modalidad,
          inicio_at: inicioAtStr,
          fin_at: finAtStr,
          fecha_inicio: data.fecha_inicio.toISOString(),
          fecha_fin: data.fecha_fin.toISOString(),
          monto_total: Number(data.monto_total || 0),
          sena_eleccion: data.sena_eleccion,
          sena_tipo: senaTipoPayload,
          sena_valor: senaValorPayload,
          monto_sena: montoSenaPayload,
          monto_deposito: Number(data.monto_deposito || 0),
          estado_pago: data.estado_pago,
          observaciones: data.observaciones,
          contrato_url: contratoUrl,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Error al crear el alquiler (${res.status})`);
      }

      setSuccessMessage('¡Alquiler registrado con éxito!');
      form.reset();
      setContratoFile(null);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error inesperado al registrar el alquiler';
      setApiErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasInquilinos = inquilinosList.length > 0;
  const hasUnidades = unidadesList.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSuccessMessage(null); setApiErrorMessage(null); } }}>
      <DialogTrigger
        onClick={() => setOpen(true)}
        render={
          <Button
            data-testid="btn-nuevo-alquiler"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Alquiler
          </Button>
        }
      />
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 box-border">
        <DialogHeader className="pr-14 text-left">
          <DialogTitle className="text-base sm:text-lg font-bold">Nuevo Alquiler</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Registrá un nuevo contrato locativo con modalidad explícita e intervalos precisos.
          </DialogDescription>
        </DialogHeader>

        {apiErrorMessage && (
          <div
            data-testid="alquiler-api-error"
            className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs my-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{apiErrorMessage}</span>
          </div>
        )}

        {successMessage ? (
          <div
            data-testid="alquiler-success-feedback"
            className="w-full box-border p-4 sm:p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-center space-y-4 my-4 overflow-hidden"
          >
            <ShieldCheck className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400" />
            <div className="font-bold text-base">{successMessage}</div>
            <p className="text-xs text-muted-foreground">
              La operación autorizada se ejecutó correctamente dentro de tu alcance.
            </p>
            <div className="pt-2 flex justify-center">
              <Button
                type="button"
                data-testid="btn-cerrar-alquiler-exito"
                onClick={() => handleOpenChange(false)}
                className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-6 text-sm font-medium"
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Selector Canónico de Modalidad */}
            <div className="grid gap-1.5 p-3 rounded-xl bg-muted/20 border border-border/80">
              <div className="flex items-center justify-between">
                <Label htmlFor="modalidad" className="text-xs font-semibold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>Modalidad de Alquiler *</span>
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-bold">
                    {watchedModalidad}
                  </span>
                </div>
              </div>

              <select
                id="modalidad"
                name="modalidad"
                data-testid="modality-select"
                value={watchedModalidad}
                onChange={(e) => handleModalityChange(e.target.value as RentalModality)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="mensual">Mensual (Contrato a largo plazo)</option>
                <option value="diaria">Diaria (Por día / noche)</option>
                <option value="por_hora">Por Hora (Turnos)</option>
              </select>

              {/* Botones de acceso rápido para auditorías de accesibilidad */}
              <div className="flex items-center gap-1.5 pt-1">
                <Button
                  type="button"
                  variant={watchedModalidad === 'mensual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleModalityChange('mensual')}
                  className="h-7 text-[11px] px-2.5 font-medium"
                >
                  <Calendar className="h-3 w-3 mr-1" /> Mensual
                </Button>
                <Button
                  type="button"
                  variant={watchedModalidad === 'diaria' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleModalityChange('diaria')}
                  className="h-7 text-[11px] px-2.5 font-medium"
                >
                  <Calendar className="h-3 w-3 mr-1" /> Diaria
                </Button>
                <Button
                  type="button"
                  variant={watchedModalidad === 'por_hora' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleModalityChange('por_hora')}
                  className="h-7 text-[11px] px-2.5 font-medium"
                >
                  <Clock className="h-3 w-3 mr-1" /> Por Hora
                </Button>
              </div>
            </div>

            {/* Selección de Unidad */}
            <div className="grid gap-1.5">
              <Label htmlFor="unidad_id">Unidad *</Label>
              <select
                id="unidad_id"
                name="unidad_id"
                value={form.watch('unidad_id')}
                onChange={(e) => form.setValue('unidad_id', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 truncate"
                disabled={!hasUnidades}
              >
                <option value="">{hasUnidades ? 'Seleccione una unidad' : 'Cargá una unidad primero'}</option>
                {unidadesList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.titulo_es || `Unidad ${u.categoria}`}
                  </option>
                ))}
              </select>
              {form.formState.errors.unidad_id && (
                <span className="text-xs text-destructive">{form.formState.errors.unidad_id.message}</span>
              )}
            </div>

            {/* Selección de Inquilino + Creación Rápida in situ */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="inquilino_id">Inquilino *</Label>
              </div>
              <div className="flex items-center gap-2">
                <select
                  id="inquilino_id"
                  name="inquilino_id"
                  value={form.watch('inquilino_id')}
                  onChange={(e) => form.setValue('inquilino_id', e.target.value)}
                  className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 truncate"
                  disabled={!hasInquilinos}
                >
                  <option value="">{hasInquilinos ? 'Seleccione un inquilino' : 'Cargá un inquilino primero'}</option>
                  {inquilinosList.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre_completo}
                    </option>
                  ))}
                </select>

                <InquilinoFormModal
                  token={token}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] px-2.5 text-xs shrink-0 whitespace-nowrap"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Inquilino
                    </Button>
                  }
                  onCreated={(newInq) => {
                    setInquilinosList((prev: InquilinoOption[]) => [newInq, ...prev]);
                    form.setValue('inquilino_id', newInq.id);
                  }}
                />
              </div>
              {form.formState.errors.inquilino_id && (
                <span className="text-xs text-destructive">{form.formState.errors.inquilino_id.message}</span>
              )}
            </div>

            {/* Grilla Responsive de Fechas y Semántica de Modalidad */}
            <div className="space-y-3 p-3.5 rounded-xl border border-border/80 bg-muted/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="fecha_inicio" data-testid="daily-checkin" className="text-xs">
                    {watchedModalidad === 'diaria'
                      ? 'Check-in (Ingreso) *'
                      : watchedModalidad === 'por_hora'
                      ? 'Fecha del Turno *'
                      : 'Fecha Inicio / Check-in *'}
                  </Label>
                  <Controller
                    control={form.control}
                    name="fecha_inicio"
                    render={({ field }) => (
                      <DatePicker date={field.value} setDate={field.onChange} dateFormat="dd/MM/yyyy" />
                    )}
                  />
                  {form.formState.errors.fecha_inicio && (
                    <span className="text-xs text-destructive">{form.formState.errors.fecha_inicio.message}</span>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="fecha_fin" className="text-xs">
                    {watchedModalidad === 'diaria' ? 'Check-out (Egreso) *' : 'Fecha Fin *'}
                  </Label>
                  <Controller
                    control={form.control}
                    name="fecha_fin"
                    render={({ field }) => (
                      <DatePicker date={field.value} setDate={field.onChange} dateFormat="dd/MM/yyyy" />
                    )}
                  />
                  {form.formState.errors.fecha_fin && (
                    <span className="text-xs text-destructive">{form.formState.errors.fecha_fin.message}</span>
                  )}
                </div>
              </div>

              {/* Time Pickers for Hourly Modality */}
              <div className={watchedModalidad === 'por_hora' ? 'grid grid-cols-2 gap-3 pt-1 border-t border-border/60' : 'hidden'}>
                <div className="grid gap-1">
                  <Label htmlFor="hora_inicio" className="text-[11px] font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" /> Hora Inicio (ART UTC-3) *
                  </Label>
                  <Input
                    id="hora_inicio"
                    data-testid="time-start"
                    type="time"
                    {...form.register('hora_inicio')}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="hora_fin" className="text-[11px] font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" /> Hora Fin (ART UTC-3) *
                  </Label>
                  <Input
                    id="hora_fin"
                    data-testid="time-end"
                    type="time"
                    {...form.register('hora_fin')}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Monto Total */}
            <div className="grid gap-1.5">
              <Label htmlFor="monto_total">Monto Total del Contrato ($ ARS) *</Label>
              <Input
                id="monto_total"
                type="number"
                min={0}
                step="any"
                {...form.register('monto_total', { valueAsNumber: true })}
                placeholder="0.00"
                className="text-xs sm:text-sm font-semibold"
              />
              {form.formState.errors.monto_total && (
                <span className="text-xs text-destructive">{form.formState.errors.monto_total.message}</span>
              )}
            </div>

            {/* Sección de Seña Opcional y Reutilizable */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-amber-500" />
                  <span>Seña / Anticipo de Reserva</span>
                </Label>
              </div>

              {/* Indicador de Origen / Herencia de Grupo (únicamente si existe grupo válido y activo con seña positiva) */}
              {isGrupoDefaultAvailable && selectedGrupo && (
                <div
                  data-testid="sena-inheritance-source"
                  className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      <strong>Heredado de Grupo:</strong> {selectedGrupo.nombre} (Seña sugerida:{' '}
                      {selectedGrupo.sena_default_tipo === 'monto_fijo'
                        ? `$${Number(selectedGrupo.sena_default_valor).toLocaleString('es-AR')}`
                        : `${selectedGrupo.sena_default_valor}%`}
                      )
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue('sena_eleccion', 'heredar_grupo');
                      const tipo = selectedGrupo.sena_default_tipo || 'porcentaje';
                      const val = Number(selectedGrupo.sena_default_valor ?? selectedGrupo.sena_porcentaje ?? 0);
                      const calculated = tipo === 'porcentaje'
                        ? Math.round((watchedTotal * val) / 100)
                        : val;
                      form.setValue('monto_sena', calculated);
                    }}
                    className="h-6 text-[10px] px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                  >
                    Aplicar sugerida
                  </Button>
                </div>
              )}

              {/* Selector de Elección de Seña */}
              <div className={`grid ${isGrupoDefaultAvailable ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                <button
                  type="button"
                  data-testid="btn-sena-sin-sena"
                  onClick={() => {
                    form.setValue('sena_eleccion', 'sin_sena');
                    form.setValue('monto_sena', 0);
                    form.setValue('sena_tipo', undefined);
                    form.setValue('sena_valor', undefined);
                  }}
                  className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                    watchedSenaEleccion === 'sin_sena'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  Sin seña
                </button>
                {isGrupoDefaultAvailable && (
                  <button
                    type="button"
                    data-testid="btn-sena-heredar-grupo"
                    onClick={() => {
                      form.setValue('sena_eleccion', 'heredar_grupo');
                      const tipo = selectedGrupo?.sena_default_tipo || 'porcentaje';
                      const val = Number(selectedGrupo?.sena_default_valor ?? selectedGrupo?.sena_porcentaje ?? 0);
                      const calculated = tipo === 'porcentaje'
                        ? Math.round((watchedTotal * val) / 100)
                        : val;
                      form.setValue('monto_sena', calculated);
                    }}
                    className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                      watchedSenaEleccion === 'heredar_grupo'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    Heredar del grupo
                  </button>
                )}
                <button
                  type="button"
                  data-testid="btn-sena-personalizada"
                  onClick={() => {
                    form.setValue('sena_eleccion', 'personalizada');
                    if (!form.getValues('sena_tipo')) {
                      form.setValue('sena_tipo', 'monto_fijo');
                    }
                    if (form.getValues('sena_valor') === undefined || form.getValues('sena_valor') === 0) {
                      form.setValue('sena_valor', 50000);
                      form.setValue('monto_sena', 50000);
                    }
                  }}
                  className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                    watchedSenaEleccion === 'personalizada'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  Personalizada
                </button>
              </div>

              {/* Sub-estado: Sin Seña */}
              {watchedSenaEleccion === 'sin_sena' && (
                <div
                  data-testid="sena-sin-sena-note"
                  className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-muted-foreground text-center"
                >
                  El contrato se registrará sin anticipo ni reserva previa.
                </div>
              )}

              {/* Sub-estado: Heredar del Grupo */}
              {watchedSenaEleccion === 'heredar_grupo' && isGrupoDefaultAvailable && selectedGrupo && (
                <div
                  data-testid="sena-preview-card"
                  className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between text-amber-800 dark:text-amber-200"
                >
                  <span>
                    Seña heredada de <strong>{selectedGrupo.nombre}</strong> (
                    {selectedGrupo.sena_default_tipo === 'monto_fijo'
                      ? `$${Number(selectedGrupo.sena_default_valor).toLocaleString('es-AR')}`
                      : `${selectedGrupo.sena_default_valor}%`}
                    ):
                  </span>
                  <span data-testid="sena-preview-amount" className="font-bold font-mono">
                    ${(watchedSena || 0).toLocaleString('es-AR')}
                  </span>
                </div>
              )}

              {/* Sub-estado: Seña Personalizada */}
              {watchedSenaEleccion === 'personalizada' && (
                <div className="p-3 rounded-lg border border-border/80 bg-background/50 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      data-testid="sena-tipo-monto-fijo"
                      onClick={() => {
                        form.setValue('sena_tipo', 'monto_fijo');
                        const val = form.getValues('sena_valor') || 50000;
                        form.setValue('sena_valor', val, { shouldValidate: true });
                        form.setValue('monto_sena', val, { shouldValidate: true });
                      }}
                      className={`p-1.5 rounded-md border text-xs font-medium transition-colors ${
                        watchedSenaTipo === 'monto_fijo'
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Monto Fijo ($ ARS)
                    </button>
                    <button
                      type="button"
                      data-testid="sena-tipo-porcentaje"
                      onClick={() => {
                        form.setValue('sena_tipo', 'porcentaje');
                        const raw = form.getValues('sena_valor') || 20;
                        const pct = raw > 100 ? 20 : raw <= 0 ? 10 : raw;
                        form.setValue('sena_valor', pct, { shouldValidate: true });
                        form.setValue('monto_sena', Math.round((watchedTotal * pct) / 100), { shouldValidate: true });
                      }}
                      className={`p-1.5 rounded-md border text-xs font-medium transition-colors ${
                        watchedSenaTipo === 'porcentaje'
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Porcentaje (%)
                    </button>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="sena_valor" className="text-xs">
                      {watchedSenaTipo === 'porcentaje'
                        ? 'Porcentaje de Seña (1–100%) *'
                        : 'Monto Fijo de Seña ($ ARS) *'}
                    </Label>
                    <Input
                      id="sena_valor"
                      data-testid="sena-valor-input"
                      type="number"
                      min={1}
                      max={watchedSenaTipo === 'porcentaje' ? 100 : undefined}
                      step="any"
                      value={form.watch('sena_valor') ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                        form.setValue('sena_valor', val, { shouldValidate: true });
                        if (val !== undefined && !isNaN(val)) {
                          if (watchedSenaTipo === 'porcentaje') {
                            form.setValue('monto_sena', Math.round((watchedTotal * val) / 100), { shouldValidate: true });
                          } else {
                            form.setValue('monto_sena', val, { shouldValidate: true });
                          }
                        } else {
                          form.setValue('monto_sena', 0);
                        }
                      }}
                      placeholder={watchedSenaTipo === 'porcentaje' ? '20' : '50000'}
                      className="text-xs sm:text-sm font-semibold font-mono"
                    />
                    {(form.formState.errors.sena_valor || form.formState.errors.monto_sena) && (
                      <span data-testid="sena-valor-error" className="text-xs text-destructive">
                        {form.formState.errors.sena_valor?.message || form.formState.errors.monto_sena?.message}
                      </span>
                    )}
                  </div>

                  <div
                    data-testid="sena-preview-card"
                    className="p-2.5 rounded-md bg-muted/40 border border-border/60 text-xs flex items-center justify-between"
                  >
                    <span className="text-muted-foreground">Seña efectiva calculada:</span>
                    <span data-testid="sena-preview-amount" className="font-bold font-mono text-foreground">
                      ${(watchedSena || 0).toLocaleString('es-AR')}
                      {watchedSenaTipo === 'porcentaje' && (
                        <span className="text-[11px] font-normal text-muted-foreground ml-1">
                          ({watchedSenaValor || 0}% de ${watchedTotal.toLocaleString('es-AR')})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}

                <div className="grid gap-1.5">
                  <Label htmlFor="monto_deposito" className="text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Depósito en Garantía ($ ARS)</span>
                  </Label>
                  <Input
                    id="monto_deposito"
                    type="number"
                    min={0}
                    step="any"
                    {...form.register('monto_deposito', { valueAsNumber: true })}
                    placeholder="0.00"
                    className="text-xs sm:text-sm"
                  />
                  {form.formState.errors.monto_deposito && (
                    <span className="text-xs text-destructive">{form.formState.errors.monto_deposito.message}</span>
                  )}
                </div>
              </div>

            {/* Selector de Estado del Cobro Inicial */}
            <div className="grid gap-1.5">
              <Label htmlFor="estado_pago" className="text-xs font-semibold flex items-center gap-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                <span>Estado del Cobro Inicial *</span>
              </Label>
              <select
                id="estado_pago"
                {...form.register('estado_pago')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="pendiente">Pendiente de Cobro (Cobrado al iniciar: $0)</option>
                <option value="seña_cobrada">
                  Seña / Anticipo Cobrado (Percibido en caja: ${Number(watchedSena || 0).toLocaleString('es-AR')})
                </option>
                <option value="cobrado_total">
                  Cobrado Totalmente (Percibido en caja: ${Number(watchedTotal || 0).toLocaleString('es-AR')})
                </option>
              </select>
            </div>

            {/* Widget de Desglose Financiero en Tiempo Real */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                    Desglose Financiero (Criterio de Caja)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Sincronización en vivo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-background border border-border/60">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase block truncate">
                    Total Contratado
                  </span>
                  <div className="text-xs sm:text-sm font-bold font-mono text-foreground mt-0.5 truncate">
                    ${Number(watchedTotal || 0).toLocaleString('es-AR')}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 uppercase block truncate">
                    Cobrado al Iniciar (Caja)
                  </span>
                  <div className="text-xs sm:text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                    ${Number(cobradoInicial || 0).toLocaleString('es-AR')}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 uppercase block truncate">
                    Saldo Pendiente
                  </span>
                  <div className="text-xs sm:text-sm font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5 truncate">
                    ${Number(saldoPendiente || 0).toLocaleString('es-AR')}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <span className="text-[10px] font-mono text-blue-700 dark:text-blue-300 uppercase block truncate">
                    En Custodia (Garantía)
                  </span>
                  <div className="text-xs sm:text-sm font-bold font-mono text-blue-700 dark:text-blue-400 mt-0.5 truncate">
                    ${Number(fondosCustodia || 0).toLocaleString('es-AR')}
                  </div>
                </div>
              </div>
            </div>

            {/* Anexar Contrato en PDF (Opcional) */}
            <div className="border border-dashed border-border/80 rounded-xl p-3.5 bg-muted/10 space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Contrato Digital Firmado (Opcional)</span>
              </Label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="contrato-upload"
              />

              {!contratoFile ? (
                <label
                  htmlFor="contrato-upload"
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-card/60 hover:bg-card cursor-pointer transition-colors text-center"
                >
                  <UploadCloud className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs font-medium text-foreground">Subir contrato (.pdf, máx 10 MB)</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Podés asociar el documento legal firmado para consulta permanente
                  </span>
                </label>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{contratoFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(contratoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    title="Remover archivo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {contratoError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{contratoError}</span>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                data-testid="btn-guardar-alquiler"
                disabled={isSubmitting || !hasUnidades || !hasInquilinos}
                className="w-full sm:w-auto min-h-[44px]"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Alquiler'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AlquilerFormModal;
