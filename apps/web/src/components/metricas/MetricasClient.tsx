'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  MessageCircle,
  TrendingUp,
  Home,
  DollarSign,
  ShieldAlert,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
  Building2,
  Lock,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface MetricasData {
  puede_ver_financiero: boolean;
  resumen: {
    total_vistas: number;
    total_contactos: number;
    tasa_conversion_general: number;
    unidades_activas: number;
    tasa_ocupacion: number;
    ingresos_totales: number | null;
    ingresos_mes_actual: number | null;
    ingresos_pendientes_cobro: number | null;
    fondos_en_custodia?: number | null;
  };
  serie_temporal: Array<{
    fecha: string;
    vistas: number;
    contactos: number;
    facturacion: number | null;
    conversion: number;
  }>;
  rendimiento_unidades: Array<{
    id: string;
    titulo: string;
    categoria: string;
    vistas: number;
    contactos: number;
    ratio_conversion: number;
    estado: string;
  }>;
  distribucion_ocupacion: Array<{
    categoria: string;
    total: number;
    alquiladas: number;
    tasa: number;
  }>;
  financiero: {
    ingresos_totales: number;
    ingresos_mes_actual: number;
    ingresos_pendientes_cobro: number;
    fondos_en_custodia?: number;
    ingresos_por_categoria: Array<{
      categoria: string;
      monto: number;
    }>;
  } | null;
}

const CATEGORY_COLORS = ['#3B5FC4', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#64748B'];

export function MetricasClient({
  locale,
  initialToken,
  userRole = 'gestor',
}: {
  locale: string;
  initialToken?: string;
  userRole?: string;
}) {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MetricasData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<'7' | '14' | '30' | '90' | 'custom'>('30');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [unidadFiltro, setUnidadFiltro] = useState('');
  const [tipoGrafico, setTipoGrafico] = useState<'vistas' | 'contactos' | 'facturacion'>('vistas');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);

    if (searchParams?.get('state') === 'api-error' || searchParams?.get('api-error') === 'true') {
      setError('Error al sincronizar con el servicio analítico. Reintente más tarde.');
      setData(null);
      setLoading(false);
      return;
    }

    if (searchParams?.get('state') === 'empty' || searchParams?.get('empty') === 'true') {
      setData({
        puede_ver_financiero: userRole !== 'delegado',
        resumen: {
          total_vistas: 0,
          total_contactos: 0,
          tasa_conversion_general: 0,
          unidades_activas: 0,
          tasa_ocupacion: 0,
          ingresos_totales: 0,
          ingresos_mes_actual: 0,
          ingresos_pendientes_cobro: 0,
          fondos_en_custodia: 0,
        },
        serie_temporal: [],
        rendimiento_unidades: [],
        distribucion_ocupacion: [],
        financiero: {
          ingresos_totales: 0,
          ingresos_mes_actual: 0,
          ingresos_pendientes_cobro: 0,
          fondos_en_custodia: 0,
          ingresos_por_categoria: [],
        },
      });
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      const params = new URLSearchParams();

      if (preset !== 'custom') {
        params.append('dias', preset);
      } else {
        if (fechaDesde) params.append('fecha_desde', fechaDesde);
        if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      }

      if (unidadFiltro) {
        params.append('unidad_id', unidadFiltro);
      }

      const res = await fetch(`${apiUrl}/metricas?${params.toString()}`, {
        headers: {
          Authorization: initialToken ? `Bearer ${initialToken}` : 'Bearer dev-access-token-gestor',
        },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        setError('No se pudieron recuperar las métricas operativas.');
      }
    } catch (err) {
      console.error('Error al cargar métricas:', err);
      setError('Fallo de conexión al cargar métricas.');
    } finally {
      setLoading(false);
    }
  }, [preset, fechaDesde, fechaHasta, unidadFiltro, initialToken, searchParams, userRole]);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, fetchData]);

  if (!mounted) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/60 rounded-3xl" />
          ))}
        </div>
        <div className="h-96 bg-muted/40 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="metricas-api-error" className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">
              Métricas de Rendimiento
            </h1>
            <p className="text-sm text-destructive dark:text-rose-400 mt-1 font-mono">
              {error}
            </p>
          </div>
        </div>
        <div className="p-8 rounded-3xl bg-surface border border-border/80 shadow-sm text-center space-y-4">
          <p className="text-sm text-muted-foreground dark:text-[#AEB7C7] max-w-md mx-auto">
            Ocurrió un error al contactar el servicio de analítica de Rendo. Por favor verifique su conexión y vuelva a intentar.
          </p>
          <button
            onClick={() => {
              setError(null);
              fetchData();
            }}
            className="px-5 py-2.5 min-h-[44px] inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar Carga
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return '$0';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto overflow-hidden space-y-8 animate-fade-in">
      {/* Header & Filtros Rápidos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Inteligencia Operativa &amp; Analítica</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Métricas de Rendimiento
          </h1>
          <p className="text-sm text-muted-foreground dark:text-[#AEB7C7] mt-1">
            Monitoreo en tiempo real de interacciones, demanda del marketplace y conversiones.
          </p>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-surface border border-border/80 rounded-2xl p-1 shadow-sm">
            {(['7', '14', '30', '90'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPreset(p);
                }}
                className={`px-3 py-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-semibold rounded-xl transition-all ${
                  preset === p
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground dark:text-[#AEB7C7] hover:text-foreground'
                }`}
              >
                {p}D
              </button>
            ))}
            <button
              onClick={() => setPreset('custom')}
              className={`px-3 py-1.5 min-h-[44px] flex items-center justify-center text-xs font-semibold rounded-xl transition-all ${
                preset === 'custom'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground dark:text-[#AEB7C7] hover:text-foreground'
              }`}
            >
              Personalizado
            </button>
          </div>

          {data?.rendimiento_unidades && data.rendimiento_unidades.length > 0 && (
            <select
              value={unidadFiltro}
              onChange={(e) => setUnidadFiltro(e.target.value)}
              className="bg-surface border border-border/80 rounded-2xl px-3 py-1.5 min-h-[44px] text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              <option value="">Todas las unidades</option>
              {data.rendimiento_unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.titulo}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] text-xs font-semibold rounded-2xl border border-border/80 bg-surface hover:bg-muted/80 text-foreground transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Selector de Fechas Personalizadas si preset === 'custom' */}
      {preset === 'custom' && (
        <div className="p-4 bg-surface rounded-2xl border border-border/80 shadow-sm flex flex-wrap items-center gap-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground dark:text-[#AEB7C7]">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-1.5 min-h-[44px] text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground dark:text-[#AEB7C7]">Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-1.5 min-h-[44px] text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => fetchData()}
            className="px-4 py-1.5 min-h-[44px] flex items-center justify-center bg-primary text-primary-foreground text-xs font-semibold rounded-xl shadow-sm hover:bg-primary/90 transition-all"
          >
            Aplicar Rango
          </button>
        </div>
      )}

      {/* Banner Informativo RBAC si es Delegado */}
      {(userRole === 'delegado' || (data && !data.puede_ver_financiero)) && (
        <div className="p-4 rounded-2xl border border-dorado-500/30 bg-dorado-500/10 text-dorado-950 dark:text-dorado-200 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-dorado-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold">Vista de Operaciones (Perfil Delegado)</p>
            <p className="opacity-90">
              Los indicadores financieros (ingresos totales, proyecciones y facturación) se encuentran restringidos por política de seguridad de la cuenta del Gestor titular.
            </p>
          </div>
        </div>
      )}

      {/* BLOQUE 1: KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Vistas */}
        <div className="bg-surface p-5 sm:p-6 rounded-3xl border border-border/80 shadow-sm relative min-h-[130px] flex flex-col justify-between overflow-visible group hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Vistas Totales
            </span>
            <div className="p-2.5 rounded-2xl bg-azul-500/10 text-azul-600 dark:text-azul-400 shrink-0">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold font-mono text-foreground leading-tight my-1">
              {data?.resumen.total_vistas ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-azul-500 shrink-0" />
              <span>Visualizaciones en la ficha pública</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Contactos WhatsApp */}
        <div className="bg-surface p-5 sm:p-6 rounded-3xl border border-border/80 shadow-sm relative min-h-[130px] flex flex-col justify-between overflow-visible group hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Contactos WhatsApp
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold font-mono text-foreground leading-tight my-1">
              {data?.resumen.total_contactos ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Conversión:{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {data?.resumen.tasa_conversion_general ?? 0}%
              </span>
            </p>
          </div>
        </div>

        {/* KPI 3: Tasa de Ocupación */}
        <div className="bg-surface p-5 sm:p-6 rounded-3xl border border-border/80 shadow-sm relative min-h-[130px] flex flex-col justify-between overflow-visible group hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Ocupación Activa
            </span>
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold font-mono text-foreground leading-tight my-1">
              {data?.resumen.tasa_ocupacion ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.resumen.unidades_activas ?? 0} unidades en inventario
            </p>
          </div>
        </div>

        {/* KPI 4: Ingresos Totales (RBAC) */}
        <div className="bg-surface p-5 sm:p-6 rounded-3xl border border-border/80 shadow-sm relative min-h-[130px] flex flex-col justify-between overflow-visible group hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Ingresos Totales
            </span>
            <div className="p-2.5 rounded-2xl bg-dorado-500/10 text-dorado-600 dark:text-dorado-400 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            {data?.puede_ver_financiero ? (
              <>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground truncate leading-tight my-1">
                  {formatCurrency(data?.resumen.ingresos_totales ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mes actual: {formatCurrency(data?.resumen.ingresos_mes_actual ?? 0)}
                </p>
                {data?.resumen.fondos_en_custodia !== undefined && data?.resumen.fondos_en_custodia !== null && data?.resumen.fondos_en_custodia > 0 ? (
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    En custodia: {formatCurrency(data.resumen.fondos_en_custodia)}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="py-2 flex items-center gap-2 text-muted-foreground">
                <Lock className="w-4 h-4 text-dorado-500 shrink-0" />
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  RF-G12: Restringido a Delegados
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BLOQUE 2: Gráfico de Evolución Diaria (Zero-Filling Garantizado) */}
      <div className="bg-surface p-6 rounded-3xl border border-border/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Evolución Temporal Continua</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Serie diaria continua sin huecos temporales para el período seleccionado.
            </p>
          </div>

          <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/50 text-xs font-medium">
            <button
              onClick={() => setTipoGrafico('vistas')}
              className={`px-3 py-1 min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
                tipoGrafico === 'vistas'
                  ? 'bg-surface text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground dark:text-[#AEB7C7] hover:text-foreground'
              }`}
            >
              Vistas ({data?.resumen.total_vistas ?? 0})
            </button>
            <button
              onClick={() => setTipoGrafico('contactos')}
              className={`px-3 py-1 min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
                tipoGrafico === 'contactos'
                  ? 'bg-surface text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground dark:text-[#AEB7C7] hover:text-foreground'
              }`}
            >
              Contactos ({data?.resumen.total_contactos ?? 0})
            </button>
            {data?.puede_ver_financiero && (
              <button
                onClick={() => setTipoGrafico('facturacion')}
                className={`px-3 py-1 min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
                  tipoGrafico === 'facturacion'
                    ? 'bg-surface text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground dark:text-[#AEB7C7] hover:text-foreground'
                }`}
              >
                Facturación ($)
              </button>
            )}
          </div>
        </div>

        {/* Gráfico Recharts */}
        <div className="h-72 sm:h-80 w-full pt-2" data-testid="metricas-charts">
          {data?.serie_temporal && data.serie_temporal.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.serie_temporal}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={
                        tipoGrafico === 'vistas'
                          ? '#3B5FC4'
                          : tipoGrafico === 'contactos'
                          ? '#10B981'
                          : '#F59E0B'
                      }
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={
                        tipoGrafico === 'vistas'
                          ? '#3B5FC4'
                          : tipoGrafico === 'contactos'
                          ? '#10B981'
                          : '#F59E0B'
                      }
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={(val) => val.substring(5)} // MM-DD
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const val = payload[0].value;
                      return (
                        <div className="p-3 bg-surface/95 backdrop-blur-md rounded-2xl border border-border shadow-glass text-xs space-y-1">
                          <p className="font-mono text-muted-foreground font-semibold">{label}</p>
                          <p className="font-bold text-foreground flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{
                                backgroundColor:
                                  tipoGrafico === 'vistas'
                                    ? '#3B5FC4'
                                    : tipoGrafico === 'contactos'
                                    ? '#10B981'
                                    : '#F59E0B',
                              }}
                            />
                            {tipoGrafico === 'facturacion'
                              ? formatCurrency(Number(val))
                              : `${val} ${tipoGrafico}`}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={
                    tipoGrafico === 'vistas'
                      ? 'vistas'
                      : tipoGrafico === 'contactos'
                      ? 'contactos'
                      : 'facturacion'
                  }
                  stroke={
                    tipoGrafico === 'vistas'
                      ? '#3B5FC4'
                      : tipoGrafico === 'contactos'
                      ? '#10B981'
                      : '#F59E0B'
                  }
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMetric)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div data-testid="metricas-empty-state" className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground dark:text-[#AEB7C7] space-y-2">
              <p className="font-semibold text-sm text-foreground">Sin actividad registrada en este período</p>
              <p className="max-w-xs">No hay visualizaciones ni contactos registrados en las fechas seleccionadas.</p>
            </div>
          )}
        </div>
      </div>

      {/* BLOQUE 3: Dos Columnas (Distribución de Categorías & Rendimiento de Unidades) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por Categoría */}
        <div className="bg-surface p-6 rounded-3xl border border-border/80 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Ocupación por Tipo</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Proporción de unidades alquiladas por categoría de inmueble.
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {data?.distribucion_ocupacion && data.distribucion_ocupacion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.distribucion_ocupacion}
                    dataKey="total"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data.distribucion_ocupacion.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="p-2.5 bg-surface/95 backdrop-blur-md rounded-2xl border border-border shadow-glass text-xs space-y-1">
                            <p className="font-bold capitalize text-foreground">{item.categoria}</p>
                            <p className="text-muted-foreground">
                              {item.alquiladas} / {item.total} alquiladas ({item.tasa}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">No hay categorías registradas</p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            {data?.distribucion_ocupacion?.map((item, idx) => (
              <div key={item.categoria} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="capitalize text-foreground font-medium">{item.categoria}</span>
                </div>
                <div className="font-mono text-muted-foreground">
                  {item.alquiladas}/{item.total}{' '}
                  <span className="font-semibold text-foreground">({item.tasa}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rendimiento por Unidad (Top / Ranking) */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-3xl border border-border/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-dorado-500" />
                <span>Rendimiento Individual de Unidades</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vistas, contactos y tasa de conversión de cada unidad en tu workspace.
              </p>
            </div>
            <Link
              href={`/${locale}/mis-unidades`}
              className="text-xs font-semibold text-primary hover:underline min-h-[44px] inline-flex items-center gap-1"
            >
              <span>Ver Bento de Unidades</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {data?.rendimiento_unidades && data.rendimiento_unidades.length > 0 ? (
              data.rendimiento_unidades.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate block max-w-xs">
                        {u.titulo}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono capitalize bg-surface border border-border/80 text-muted-foreground dark:text-[#AEB7C7] shrink-0">
                        {u.categoria}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground dark:text-[#AEB7C7] font-mono">
                      <span>{u.vistas} vistas</span>
                      <span>•</span>
                      <span>{u.contactos} contactos</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-foreground">
                        {u.ratio_conversion}%
                      </div>
                      <div className="text-[10px] text-muted-foreground dark:text-[#AEB7C7] font-medium">Conversión</div>
                    </div>

                    <div className="w-20 bg-border/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(u.ratio_conversion * 4, 100)}%` }}
                      />
                    </div>

                    <Link
                      href={`/${locale}/unidades/${u.id}`}
                      target="_blank"
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      title="Ver en Marketplace"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay unidades registradas en este workspace.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BLOQUE 4: Módulo Financiero (RF-G12) y Módulo CRM Inquilinos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Bloque Financiero */}
        <div className="bg-surface p-6 rounded-3xl border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-dorado-500" />
              <span>Módulo Financiero y Facturación</span>
            </h2>
            {data?.puede_ver_financiero ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
                Acceso Gestor Habilitado
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Candado RF-G12
              </span>
            )}
          </div>

          {data?.puede_ver_financiero ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Mes Actual (Caja)</span>
                  <div className="text-lg font-bold font-mono text-foreground mt-0.5 truncate">
                    {formatCurrency(data?.financiero?.ingresos_mes_actual ?? data?.resumen.ingresos_mes_actual ?? 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Ingreso real percibido</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">Pendiente de Cobro</span>
                  <div className="text-lg font-bold font-mono text-foreground mt-0.5 truncate">
                    {formatCurrency(data?.financiero?.ingresos_pendientes_cobro ?? data?.resumen.ingresos_pendientes_cobro ?? 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Saldo de contratos activos</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                  <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 uppercase font-semibold">En Custodia (Garantías)</span>
                  <div className="text-lg font-bold font-mono text-foreground mt-0.5 truncate">
                    {formatCurrency(data?.financiero?.fondos_en_custodia ?? data?.resumen.fondos_en_custodia ?? 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">No computable en ingresos</p>
                </div>
              </div>

              {data?.financiero?.ingresos_por_categoria && data.financiero.ingresos_por_categoria.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground">Ingresos por Categoría</span>
                  {data.financiero.ingresos_por_categoria.map((c) => (
                    <div key={c.categoria} className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/20">
                      <span className="capitalize text-foreground font-medium">{c.categoria}</span>
                      <span className="font-mono font-bold text-foreground">{formatCurrency(c.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Restricción RF-G12: Rol Delegado</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Por política de seguridad y aislamiento de workspace, los balances financieros, facturación y estados de cobro están reservados exclusivamente al Gestor titular.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bloque CRM Inquilinos */}
        <div className="bg-surface p-6 rounded-3xl border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Actividad CRM e Inquilinos</span>
            </h2>
            <Link
              href={`/${locale}/inquilinos`}
              className="text-xs font-semibold text-primary hover:underline min-h-[44px] inline-flex items-center gap-1"
            >
              <span>Ir a Inquilinos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                <span className="text-[11px] font-mono text-muted-foreground uppercase">Tasa Conversión</span>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {data?.resumen.tasa_conversion_general ?? 0}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Contactos / Vistas</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                <span className="text-[11px] font-mono text-muted-foreground uppercase">Ocupación Total</span>
                <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                  {data?.resumen.tasa_ocupacion ?? 0}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">De unidades activas</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Contactos totales generados:</span>
              <span className="font-mono font-bold text-foreground">{data?.resumen.total_contactos ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
