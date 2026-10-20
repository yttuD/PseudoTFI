'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientAuthToken } from '@/lib/supabase/client-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ReceiptText,
  Plus,
  Download,
  CheckCircle2,
  FileCheck2,
  DollarSign,
  AlertCircle,
  Building2,
  Edit3,
  Save,
  AlertTriangle,
  X,
} from 'lucide-react';

export interface ComprobanteItem {
  id: string;
  tipo_comprobante: string;
  tipo_comprobante_codigo: number;
  punto_venta: number;
  numero_comprobante: number;
  concepto: number;
  cuit_emisor: string;
  receptor_nombre: string;
  receptor_doc_tipo: string;
  receptor_doc_nro: string;
  fecha_emision: string;
  periodo_desde: string;
  periodo_hasta: string;
  importe_total: number;
  cae: string;
  cae_vencimiento: string;
  estado: string;
  pdf_url?: string | null;
  created_at: string;
}

export interface GestorAfipConfigData {
  configurado: boolean;
  id?: string;
  cuit?: string;
  razon_social?: string;
  condicion_iva?: 'monotributo' | 'responsable_inscripto' | 'exento';
  punto_venta?: number;
  iibb?: string;
  inicio_actividades?: string;
  domicilio_fiscal?: string;
  entorno?: 'homologacion' | 'produccion';
}

export interface FacturacionAfipClientProps {
  token: string;
  initialComprobantes: ComprobanteItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alquileres: any[];
  initialConfig?: GestorAfipConfigData | null;
  initialState?: string;
}

function formatCuit(cuit?: string): string {
  if (!cuit) return '-';
  const clean = cuit.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
  }
  return cuit;
}

export function FacturacionAfipClient({
  token,
  initialComprobantes,
  alquileres,
  initialConfig,
  initialState,
}: FacturacionAfipClientProps) {
  const router = useRouter();
  const [comprobantes, setComprobantes] = useState<ComprobanteItem[]>(
    initialState === 'empty' ? [] : initialComprobantes
  );
  const [openEmitirModal, setOpenEmitirModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Fiscal Config State
  const [config, setConfig] = useState<GestorAfipConfigData | null>(initialConfig || null);
  const isConfigured = Boolean(config && config.configurado);
  const [isEditingConfig, setIsEditingConfig] = useState<boolean>(!isConfigured);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // Fiscal Config Form Fields
  const [cfgCuit, setCfgCuit] = useState<string>(initialConfig?.cuit || '');
  const [cfgRazonSocial, setCfgRazonSocial] = useState<string>(initialConfig?.razon_social || '');
  const [cfgCondicionIva, setCfgCondicionIva] = useState<'monotributo' | 'responsable_inscripto' | 'exento'>(
    initialConfig?.condicion_iva || 'monotributo'
  );
  const [cfgPuntoVenta, setCfgPuntoVenta] = useState<number>(initialConfig?.punto_venta || 1);
  const [cfgIibb, setCfgIibb] = useState<string>(initialConfig?.iibb || '');
  const [cfgInicioActividades, setCfgInicioActividades] = useState<Date | undefined>(
    initialConfig?.inicio_actividades ? new Date(initialConfig.inicio_actividades) : undefined
  );
  const [cfgDomicilioFiscal, setCfgDomicilioFiscal] = useState<string>(initialConfig?.domicilio_fiscal || '');
  const [cfgEntorno, setCfgEntorno] = useState<'homologacion' | 'produccion'>(
    initialConfig?.entorno || 'homologacion'
  );

  // Emission Form State
  const [selectedAlquilerId, setSelectedAlquilerId] = useState<string>('');
  const [tipoComprobanteCodigo, setTipoComprobanteCodigo] = useState<number>(11); // 11: Factura C
  const [puntoVenta, setPuntoVenta] = useState<number>(initialConfig?.punto_venta || 1);
  const [receptorNombre, setReceptorNombre] = useState<string>('');
  const [receptorDocTipo, setReceptorDocTipo] = useState<string>('DNI');
  const [receptorDocNro, setReceptorDocNro] = useState<string>('');
  const [periodoDesde, setPeriodoDesde] = useState<Date>(new Date(Date.now() - 30 * 86400000));
  const [periodoHasta, setPeriodoHasta] = useState<Date>(new Date());
  const [importeTotal, setImporteTotal] = useState<number>(0);

  // Sync punto de venta when config updates
  useEffect(() => {
    if (config?.punto_venta) {
      setPuntoVenta(config.punto_venta);
    }
  }, [config?.punto_venta]);

  // Al seleccionar un alquiler, autocompleta los campos fiscales del receptor
  const handleSelectAlquiler = (alqId: string) => {
    setSelectedAlquilerId(alqId);
    if (!alqId) return;

    const alq = alquileres.find((a) => a.id === alqId);
    if (alq) {
      if (alq.inquilinos?.nombre_completo) {
        setReceptorNombre(alq.inquilinos.nombre_completo);
      }
      if (alq.inquilinos?.documento) {
        setReceptorDocNro(alq.inquilinos.documento);
      }
      if (alq.monto_total) {
        setImporteTotal(Number(alq.monto_total));
      }
      if (alq.fecha_inicio) {
        setPeriodoDesde(new Date(alq.fecha_inicio));
      }
      if (alq.fecha_fin) {
        setPeriodoHasta(new Date(alq.fecha_fin));
      }
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);
    setConfigSuccess(null);

    const cleanCuit = cfgCuit.replace(/\D/g, '');
    if (cleanCuit.length !== 11) {
      setConfigError('El CUIT debe contener exactamente 11 dígitos numéricos sin guiones.');
      return;
    }

    if (!cfgRazonSocial.trim()) {
      setConfigError('La Razón Social o Nombre Fiscal es requerida.');
      return;
    }

    if (!cfgDomicilioFiscal.trim()) {
      setConfigError('El Domicilio Fiscal es requerido.');
      return;
    }

    if (cfgPuntoVenta < 1) {
      setConfigError('El Punto de Venta debe ser mayor o igual a 1.');
      return;
    }

    setIsSavingConfig(true);
    try {
      const effectiveToken = getClientAuthToken(token);
      const payload = {
        cuit: cleanCuit,
        razon_social: cfgRazonSocial.trim(),
        condicion_iva: cfgCondicionIva,
        punto_venta: cfgPuntoVenta,
        iibb: cfgIibb.trim() || undefined,
        inicio_actividades: cfgInicioActividades ? cfgInicioActividades.toISOString().split('T')[0] : undefined,
        domicilio_fiscal: cfgDomicilioFiscal.trim(),
        entorno: cfgEntorno,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/afip/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Error al guardar los datos fiscales');
      }

      const savedData: GestorAfipConfigData = await res.json();
      setConfig(savedData);
      setPuntoVenta(savedData.punto_venta || cfgPuntoVenta);
      setIsEditingConfig(false);
      setConfigSuccess('Datos fiscales oficiales guardados correctamente en ARCA / AFIP.');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la configuración fiscal';
      setConfigError(msg);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isConfigured) {
      setErrorMsg('Debe configurar sus datos fiscales de emisor antes de generar comprobantes.');
      return;
    }

    if (!receptorNombre.trim() || !receptorDocNro.trim() || importeTotal <= 0) {
      setErrorMsg('Por favor completá los datos del receptor e ingresá un importe válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const effectiveToken = getClientAuthToken(token);
      const payload = {
        tipo_comprobante_codigo: tipoComprobanteCodigo,
        punto_venta: puntoVenta,
        alquiler_id: selectedAlquilerId || undefined,
        receptor_nombre: receptorNombre.trim(),
        receptor_doc_tipo: receptorDocTipo,
        receptor_doc_nro: receptorDocNro.trim(),
        concepto: 2, // Servicios
        periodo_desde: periodoDesde.toISOString().split('T')[0],
        periodo_hasta: periodoHasta.toISOString().split('T')[0],
        importe_total: Number(importeTotal),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/afip/comprobantes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Error en el servicio AFIP');
      }

      const nuevoComprobante = await res.json();
      setComprobantes((prev) => [nuevoComprobante, ...prev]);
      setSuccessMsg(`Comprobante emitido con éxito. CAE N°: ${nuevoComprobante.cae}`);

      // Reset
      setSelectedAlquilerId('');
      setReceptorNombre('');
      setReceptorDocNro('');
      setImporteTotal(0);
      setOpenEmitirModal(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al emitir comprobante';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = (comprobanteId: string) => {
    setDownloadError(null);
    const effectiveToken = getClientAuthToken(token);
    const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL}/afip/comprobantes/${comprobanteId}/pdf`;

    fetch(pdfUrl, {
      headers: {
        Authorization: `Bearer ${effectiveToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al generar PDF');
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `comprobante_afip_${comprobanteId.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((e) => {
        console.error(e);
        setDownloadError('No se pudo descargar el PDF del comprobante oficial.');
      });
  };

  // Cálculos de KPIs
  const totalFacturadoMes = comprobantes.reduce((sum, c) => sum + Number(c.importe_total || 0), 0);
  const totalComprobantes = comprobantes.length;
  const ultimoComprobante = comprobantes[0];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const condicionIvaLabel = (cond?: string) => {
    switch (cond) {
      case 'monotributo':
        return 'Monotributista';
      case 'responsable_inscripto':
        return 'Responsable Inscripto';
      case 'exento':
        return 'Exento';
      default:
        return cond || 'No especificado';
    }
  };

  return (
    <div data-testid="facturacion-afip-container" className="space-y-6 max-w-full overflow-hidden">
      {/* Alerta Preventiva si no está configurado */}
      {!isConfigured && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 shrink-0 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs sm:text-sm font-medium">
              ⚠️ Para emitir comprobantes de alquiler con validez reglamentaria, configure su CUIT, Razón Social y Punto de Venta habilitado en ARCA.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditingConfig(true);
              const el = document.getElementById('fiscal-config-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="border-amber-500/40 hover:bg-amber-500/10 text-amber-900 dark:text-amber-100 text-xs shrink-0 w-full sm:w-auto min-h-[44px] min-w-[44px]"
          >
            Configurar Datos
          </Button>
        </div>
      )}

      {downloadError && (
        <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{downloadError}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDownloadError(null)}
            className="h-8 px-2 text-xs min-h-[32px]"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Encabezado con Botón de Emisión */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-[#131F3C] dark:text-[#F5F3EE]">Facturación AFIP</h1>
            <Badge variant="outline" className="text-xs font-mono border-primary/40 text-primary bg-primary/5">
              WSFE v1
            </Badge>
          </div>
          <p className="text-muted-foreground dark:text-[#AEB7C7] mt-1 text-sm">
            Emisión de comprobantes electrónicos con CAE oficial y recibos de alquiler reglamentarios.
          </p>
        </div>

        <Dialog open={openEmitirModal} onOpenChange={setOpenEmitirModal}>
          <DialogTrigger
            render={
              <Button className="font-semibold shadow-sm min-h-[44px] min-w-[44px] px-4 py-2">
                <Plus className="mr-2 h-4 w-4" /> Emitir Comprobante
              </Button>
            }
          />
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" />
                <span>Emitir Comprobante Fiscal</span>
              </DialogTitle>
              <DialogDescription>
                Generá una Factura o Recibo electrónico homologado con CAE ante la AFIP.
              </DialogDescription>
            </DialogHeader>

            {!isConfigured ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200 space-y-3 mt-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Configuración Fiscal Requerida</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Para emitir comprobantes de alquiler con validez reglamentaria y obtener CAE oficial de ARCA/AFIP, primero debe completar sus datos fiscales de emisor (CUIT, Razón Social, Punto de Venta).
                </p>
                <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenEmitirModal(false)}
                    className="w-full sm:w-auto text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setOpenEmitirModal(false);
                      setIsEditingConfig(true);
                      const el = document.getElementById('fiscal-config-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Completar Datos Fiscales Ahora
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmitir} className="space-y-4 pt-1">
                {/* Indicador de emisor fiscal activo */}
                <div className="flex items-center justify-between text-xs p-2.5 bg-muted/40 rounded-xl border border-border/70">
                  <span className="text-muted-foreground font-medium">Emisor Fiscal:</span>
                  <span className="font-semibold text-foreground truncate">
                    {config?.razon_social} (CUIT {formatCuit(config?.cuit)}) — Pto. Vta. {config?.punto_venta}
                  </span>
                </div>

                {/* Alquiler activo (opcional para autocompletar) */}
                <div className="grid gap-1.5">
                  <Label htmlFor="alquiler_sel">Vincular a Contrato de Alquiler (Opcional)</Label>
                  <select
                    id="alquiler_sel"
                    value={selectedAlquilerId}
                    onChange={(e) => handleSelectAlquiler(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 truncate"
                  >
                    <option value="">-- Sin vincular o emisión libre --</option>
                    {alquileres.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.unidades?.titulo_es || 'Unidad'} — Inquilino: {a.inquilinos?.nombre_completo || 'Sin nombre'} (${Number(a.monto_total || 0).toLocaleString('es-AR')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Comprobante y Punto de Venta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="tipo_comp">Tipo de Comprobante *</Label>
                    <select
                      id="tipo_comp"
                      value={tipoComprobanteCodigo}
                      onChange={(e) => setTipoComprobanteCodigo(Number(e.target.value))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value={11}>Factura C (Cód. 011)</option>
                      <option value={15}>Recibo de Alquiler C (Cód. 015)</option>
                      <option value={6}>Factura B (Cód. 006)</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="pto_vta">Punto de Venta *</Label>
                    <Input
                      id="pto_vta"
                      type="number"
                      min={1}
                      value={puntoVenta}
                      onChange={(e) => setPuntoVenta(Number(e.target.value))}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/* Datos del Receptor */}
                <div className="space-y-3 p-3 bg-muted/20 border border-border/70 rounded-xl">
                  <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
                    Datos del Receptor (Inquilino)
                  </span>

                  <div className="grid gap-1.5">
                    <Label htmlFor="rec_nombre">Nombre o Razón Social *</Label>
                    <Input
                      id="rec_nombre"
                      value={receptorNombre}
                      onChange={(e) => setReceptorNombre(e.target.value)}
                      placeholder="Ej. Carlos Gómez"
                      className="text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="doc_tipo">Tipo Documento</Label>
                      <select
                        id="doc_tipo"
                        value={receptorDocTipo}
                        onChange={(e) => setReceptorDocTipo(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none"
                      >
                        <option value="DNI">DNI</option>
                        <option value="CUIT">CUIT</option>
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="doc_nro">Número de Documento *</Label>
                      <Input
                        id="doc_nro"
                        value={receptorDocNro}
                        onChange={(e) => setReceptorDocNro(e.target.value)}
                        placeholder="Ej. 34567890"
                        className="text-xs sm:text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Período Facturado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Período Desde</Label>
                    <DatePicker
                      date={periodoDesde}
                      setDate={(d) => d && setPeriodoDesde(d)}
                      dateFormat="dd/MM/yyyy"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Período Hasta</Label>
                    <DatePicker
                      date={periodoHasta}
                      setDate={(d) => d && setPeriodoHasta(d)}
                      dateFormat="dd/MM/yyyy"
                    />
                  </div>
                </div>

                {/* Importe Total */}
                <div className="grid gap-1.5">
                  <Label htmlFor="imp_total">Importe Total ($ ARS) *</Label>
                  <Input
                    id="imp_total"
                    type="number"
                    min={1}
                    step="any"
                    value={importeTotal || ''}
                    onChange={(e) => setImporteTotal(Number(e.target.value))}
                    placeholder="0.00"
                    className="text-sm font-semibold"
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive p-2.5 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenEmitirModal(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? 'Autorizando con AFIP...' : 'Autorizar y Emitir'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* APARTADO: DATOS FISCALES DEL EMISOR (ARCA / AFIP) */}
      <Card id="fiscal-config-section" className="rounded-2xl border-border/80 shadow-sm overflow-hidden transition-all">
        <CardHeader className="border-b border-border/60 pb-4 bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base font-bold text-foreground">
                    Datos Fiscales del Emisor (ARCA / AFIP)
                  </CardTitle>
                  {isConfigured ? (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Datos Fiscales Verificados
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Pendiente de Configuración
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Datos tributarios oficiales registrados ante el fisco para comprobantes electrónicos válidos con CAE.
                </CardDescription>
              </div>
            </div>

            {!isEditingConfig && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingConfig(true)}
                className="gap-1.5 text-xs font-medium min-h-[44px] min-w-[44px] px-3.5 py-2"
              >
                <Edit3 className="h-3.5 w-3.5" /> Editar Datos
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {configSuccess && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{configSuccess}</span>
            </div>
          )}

          {configError && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{configError}</span>
            </div>
          )}

          {!isEditingConfig && isConfigured && config ? (
            /* Vista Resumen de Datos Fiscales Verificados */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border border-border/60">
                <div>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Razón Social</span>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{config.razon_social}</p>
                </div>
                <div>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">CUIT Emisor</span>
                  <p className="text-sm font-mono font-bold text-foreground mt-0.5">{formatCuit(config.cuit)}</p>
                </div>
                <div>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Condición IVA</span>
                  <p className="text-sm font-medium text-foreground mt-0.5">{condicionIvaLabel(config.condicion_iva)}</p>
                </div>
                <div>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Punto de Venta</span>
                  <p className="text-sm font-mono font-bold text-foreground mt-0.5">Pto. {String(config.punto_venta).padStart(5, '0')}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Domicilio Fiscal</span>
                  <p className="text-sm text-foreground mt-0.5">{config.domicilio_fiscal || '-'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Ingresos Brutos (IIBB)</span>
                  <p className="text-sm text-foreground mt-0.5">{config.iibb || 'Exento / Sin registrar'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Entorno Activo</span>
                  <div className="mt-0.5">
                    <Badge variant="outline" className={`text-[10px] font-mono ${config.entorno === 'produccion' ? 'border-emerald-500 text-emerald-600' : 'border-blue-500 text-blue-600'}`}>
                      {config.entorno === 'produccion' ? 'Producción (ARCA Oficial)' : 'Homologación (Testing AFIP)'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Formulario de Configuración Fiscal */
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* CUIT / CUIL */}
                <div className="grid gap-1.5">
                  <Label htmlFor="cfg_cuit" className="text-xs font-semibold">
                    CUIT / CUIL (11 dígitos) *
                  </Label>
                  <Input
                    id="cfg_cuit"
                    type="text"
                    maxLength={11}
                    value={cfgCuit}
                    onChange={(e) => setCfgCuit(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej. 20334455667"
                    className="font-mono text-xs sm:text-sm"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">Ingresá 11 números sin guiones ni espacios.</span>
                </div>

                {/* Razón Social */}
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="cfg_razon" className="text-xs font-semibold">
                    Razón Social o Nombre Fiscal *
                  </Label>
                  <Input
                    id="cfg_razon"
                    type="text"
                    value={cfgRazonSocial}
                    onChange={(e) => setCfgRazonSocial(e.target.value)}
                    placeholder="Ej. Administrador Gestor de Inmuebles"
                    className="text-xs sm:text-sm"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">Nombre tal como figura en la constancia de CUIT de ARCA.</span>
                </div>

                {/* Condición frente al IVA */}
                <div className="grid gap-1.5">
                  <Label htmlFor="cfg_iva" className="text-xs font-semibold">
                    Condición frente al IVA *
                  </Label>
                  <select
                    id="cfg_iva"
                    value={cfgCondicionIva}
                    onChange={(e) => setCfgCondicionIva(e.target.value as 'monotributo' | 'responsable_inscripto' | 'exento')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="monotributo">Monotributista</option>
                    <option value="responsable_inscripto">Responsable Inscripto</option>
                    <option value="exento">Exento</option>
                  </select>
                </div>

                {/* Punto de Venta */}
                <div className="grid gap-1.5">
                  <Label htmlFor="cfg_ptovta" className="text-xs font-semibold">
                    Punto de Venta Habilitado *
                  </Label>
                  <Input
                    id="cfg_ptovta"
                    type="number"
                    min={1}
                    value={cfgPuntoVenta}
                    onChange={(e) => setCfgPuntoVenta(Number(e.target.value))}
                    placeholder="1"
                    className="font-mono text-xs sm:text-sm"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">Punto de venta declarado para Web Services AFIP.</span>
                </div>

                {/* Modo / Entorno */}
                <div className="grid gap-1.5">
                  <Label htmlFor="cfg_entorno" className="text-xs font-semibold">
                    Modo / Entorno AFIP
                  </Label>
                  <select
                    id="cfg_entorno"
                    value={cfgEntorno}
                    onChange={(e) => setCfgEntorno(e.target.value as 'homologacion' | 'produccion')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="homologacion">Homologación (Testing)</option>
                    <option value="produccion">Producción (Oficial)</option>
                  </select>
                </div>

                {/* Ingresos Brutos (IIBB) */}
                <div className="grid gap-1.5">
                  <Label htmlFor="cfg_iibb" className="text-xs font-semibold">
                    Ingresos Brutos (IIBB)
                  </Label>
                  <Input
                    id="cfg_iibb"
                    type="text"
                    value={cfgIibb}
                    onChange={(e) => setCfgIibb(e.target.value)}
                    placeholder="Ej. Régimen Simplificado Corrientes"
                    className="text-xs sm:text-sm"
                  />
                </div>

                {/* Fecha de Inicio de Actividades */}
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">
                    Fecha de Inicio de Actividades
                  </Label>
                  <DatePicker
                    date={cfgInicioActividades}
                    setDate={(d) => setCfgInicioActividades(d)}
                    dateFormat="dd/MM/yyyy"
                  />
                </div>

                {/* Domicilio Fiscal */}
                <div className="grid gap-1.5 sm:col-span-2 md:col-span-3">
                  <Label htmlFor="cfg_domicilio" className="text-xs font-semibold">
                    Domicilio Fiscal / Comercial *
                  </Label>
                  <Input
                    id="cfg_domicilio"
                    type="text"
                    value={cfgDomicilioFiscal}
                    onChange={(e) => setCfgDomicilioFiscal(e.target.value)}
                    placeholder="Ej. Colón 1050, Goya, Corrientes"
                    className="text-xs sm:text-sm"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">Dirección fiscal que se imprimirá en el encabezado oficial de comprobantes.</span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-border/60">
                {isConfigured && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditingConfig(false);
                      setConfigError(null);
                    }}
                    className="w-full sm:w-auto text-xs"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSavingConfig}
                  className="w-full sm:w-auto text-xs font-semibold gap-1.5 shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSavingConfig ? 'Guardando Configuración...' : 'Guardar Datos Fiscales'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* 3 Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-card text-card-foreground border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm min-h-[120px] flex flex-col justify-between overflow-visible">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground leading-normal">
              Total Facturado Mes
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight my-1 leading-tight text-foreground">
              {formatCurrency(totalFacturadoMes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalComprobantes} {totalComprobantes === 1 ? 'comprobante emitido' : 'comprobantes emitidos'}
            </p>
          </div>
        </div>

        <div className="bg-card text-card-foreground border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm min-h-[120px] flex flex-col justify-between overflow-visible">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground leading-normal">
              Comprobantes Emitidos
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <FileCheck2 className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight my-1 leading-tight text-foreground">
              {totalComprobantes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Homologación WSFE v1 activa
            </p>
          </div>
        </div>

        <div className="bg-card text-card-foreground border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm min-h-[120px] flex flex-col justify-between overflow-visible">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground leading-normal">
              Último CAE Autorizado
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight my-1 leading-tight text-foreground truncate">
              {ultimoComprobante ? ultimoComprobante.cae : 'Sin emisiones'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ultimoComprobante ? `Vto: ${formatDate(ultimoComprobante.cae_vencimiento)}` : 'Listo para operar'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Comprobantes Emitidos */}
      <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base font-bold">Comprobantes Electrónicos</CardTitle>
          <CardDescription className="text-xs">
            Historial de facturas y recibos autorizados ante el organismo fiscal.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {comprobantes.length === 0 ? (
            <div
              data-testid="afip-empty-state"
              className="p-10 text-center text-muted-foreground dark:text-[#AEB7C7] text-sm font-mono"
            >
              No hay comprobantes emitidos en este workspace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-mono text-xs">Fecha</TableHead>
                    <TableHead className="font-mono text-xs">Tipo</TableHead>
                    <TableHead className="font-mono text-xs">N° Comprobante</TableHead>
                    <TableHead className="font-mono text-xs">Receptor (Inquilino)</TableHead>
                    <TableHead className="font-mono text-xs text-right">Importe</TableHead>
                    <TableHead className="font-mono text-xs">CAE</TableHead>
                    <TableHead className="font-mono text-xs text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprobantes.map((c) => {
                    const ptoStr = String(c.punto_venta).padStart(5, '0');
                    const nroStr = String(c.numero_comprobante).padStart(8, '0');
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {formatDate(c.fecha_emision)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                            {c.tipo_comprobante}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">
                          {ptoStr}-{nroStr}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground">{c.receptor_nombre}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {c.receptor_doc_tipo}: {c.receptor_doc_nro}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-right whitespace-nowrap">
                          {formatCurrency(c.importe_total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {c.cae}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              Vto: {formatDate(c.cae_vencimiento)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPdf(c.id)}
                            className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs text-foreground hover:text-primary gap-1.5"
                            title="Descargar PDF Oficial"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>PDF</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default FacturacionAfipClient;
