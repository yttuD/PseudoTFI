import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
import {
  AlertCircle,
  Clock,
  Building2,
  FileText,
  CreditCard,
  CheckCircle2,
  Users,
  UserPlus,
  History,
  ArrowUpRight,
  Home,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const tDash = await getTranslations('GestorDashboard');
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { user, accessToken: token } = await getServerAuth(cookieStore, supabase);

  if (!token) {
    return <div className="p-8 text-sm font-mono text-destructive">{tDash('unauthenticated')}</div>;
  }

  const { getServerAccessContext } = await import('@/lib/access-context');
  const accessContext = await getServerAccessContext(token);
  const isDelegado =
    accessContext?.actor === 'delegado' ||
    user?.user_metadata?.role === 'delegado' ||
    user?.user_metadata?.rol === 'delegado';

  if (isDelegado && !accessContext) {
    return (
      <div
        data-testid="access-context-error"
        className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center font-sans"
      >
        <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Error de Sincronización de Acceso</h1>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          No pudimos verificar tus permisos con el servicio de autorización. Por seguridad, el acceso ha sido bloqueado temporalmente.
        </p>
        <a
          href={`/${locale}/dashboard`}
          className="px-4 py-2 min-h-[44px] flex items-center justify-center bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </a>
      </div>
    );
  }

  // Handle explicit API error state requested via query param or simulation
  const isApiErrorRequested = searchParams?.state === 'api-error' || searchParams?.['api-error'] === 'true';
  if (isApiErrorRequested) {
    return (
      <div data-testid="dashboard-api-error" className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
              Error de Sincronización del Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground dark:text-[#AEB7C7] mt-1 font-mono">
              No fue posible establecer conexión con el servicio de métricas y cupo.
            </p>
          </div>
        </div>
        <div className="p-8 rounded-2xl bg-card border border-border shadow-xs text-center space-y-4">
          <p className="text-sm text-muted-foreground dark:text-[#AEB7C7] max-w-md mx-auto">
            El sistema no pudo recuperar la información operativa de su cuenta. Puede reintentar la solicitud o revisar sus unidades directamente.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={`/${locale}/dashboard`}
              className="px-5 py-2.5 min-h-[44px] inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              Reintentar Conexión
            </Link>
            <Link
              href={`/${locale}/mis-unidades`}
              className="px-5 py-2.5 min-h-[44px] inline-flex items-center justify-center rounded-xl bg-surface border border-border text-foreground font-semibold text-xs hover:bg-muted transition-all shadow-sm"
            >
              Ver Mis Unidades
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const delegadoActivo = isDelegado && accessContext?.actor === 'delegado' && accessContext.state === 'activo' ? accessContext : null;
  const isReadOnly = isDelegado && (!delegadoActivo || delegadoActivo.permiso === 'ver');
  const canCreateUnidad = !isDelegado;

  const fetchOptions = {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store' as RequestCache,
  };

  let cupo = null;
  let alquileres: Array<Record<string, unknown>> = [];
  let delegadosData: {
    activos: Array<{ id: string; email: string; nombre?: string; rol_permiso?: string; updated_at?: string }>;
    pendientes: Array<{ id: string; email: string; nombre?: string; rol_permiso?: string; created_at?: string }>;
  } = { activos: [], pendientes: [] };
  let unidades: Array<{ id: string; titulo_es?: string; estado?: string; updated_at?: string; created_at?: string }> = [];

  const isEmptyRequested = searchParams?.state === 'empty' || searchParams?.empty === 'true';

  if (!isEmptyRequested) {
    try {
      if (!isDelegado) {
        const [cupoRes, alquileresRes, delegadosRes, unidadesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/cupo`, {
            ...fetchOptions,
            signal: AbortSignal.timeout(2000),
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/alquileres?limit=1000`, {
            ...fetchOptions,
            signal: AbortSignal.timeout(2000),
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/delegados`, {
            ...fetchOptions,
            signal: AbortSignal.timeout(2000),
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades?limit=10`, {
            ...fetchOptions,
            signal: AbortSignal.timeout(2000),
          }),
        ]);

        cupo = cupoRes.ok ? await cupoRes.json() : null;
        const alquileresJson = alquileresRes.ok ? await alquileresRes.json() : { data: [] };
        alquileres = Array.isArray(alquileresJson) ? alquileresJson : (alquileresJson.data || []);
        if (delegadosRes.ok) {
          const rawDelegados = await delegadosRes.json();
          if (rawDelegados && typeof rawDelegados === 'object') {
            const rawDelegaciones = Array.isArray(rawDelegados.delegaciones) ? rawDelegados.delegaciones : [];
            const rawInvitaciones = Array.isArray(rawDelegados.invitaciones) ? rawDelegados.invitaciones : [];
            const rawActivos = Array.isArray(rawDelegados.activos)
              ? rawDelegados.activos
              : rawDelegaciones.map((d: Record<string, unknown>) => {
                  const delObj = d.delegado as Record<string, unknown> | undefined;
                  return {
                    id: String(d.id || ''),
                    email: String(delObj?.maskedEmail || delObj?.email || d.email || ''),
                    nombre: String(delObj?.displayName || delObj?.full_name || d.nombre || 'Colaborador'),
                    rol_permiso: d.permiso === 'gestionar' ? 'Gestionar' : 'Ver',
                    updated_at: d.updatedAt || d.updated_at,
                  };
                });
            const rawPendientes = Array.isArray(rawDelegados.pendientes)
              ? rawDelegados.pendientes
              : rawInvitaciones.map((i: Record<string, unknown>) => {
                  const delObj = i.delegado as Record<string, unknown> | undefined;
                  return {
                    id: String(i.id || ''),
                    email: String(delObj?.maskedEmail || i.email || ''),
                    nombre: String(delObj?.displayName || i.email || 'Invitado'),
                    rol_permiso: 'Pendiente',
                    created_at: i.createdAt || i.created_at,
                  };
                });

            delegadosData = {
              activos: rawActivos,
              pendientes: rawPendientes,
            };
          }
        }
        if (unidadesRes.ok) {
          const uJson = await unidadesRes.json();
          unidades = Array.isArray(uJson) ? uJson : (uJson.data || []);
        }
      } else {
        const [alquileresRes, unidadesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/alquileres?limit=1000`, {
            ...fetchOptions,
            signal: AbortSignal.timeout(2000),
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades?limit=10`, {
            ...fetchOptions,
            signal: AbortSignal.timeout(2000),
          }),
        ]);

        const alquileresJson = alquileresRes.ok ? await alquileresRes.json() : { data: [] };
        alquileres = Array.isArray(alquileresJson) ? alquileresJson : (alquileresJson.data || []);
        if (unidadesRes.ok) {
          const uJson = await unidadesRes.json();
          unidades = Array.isArray(uJson) ? uJson : (uJson.data || []);
        }
      }
    } catch (err) {
      console.warn('Backend API unavailable or timed out in dashboard:', err);
    }
  } else {
    cupo = {
      cupo_maximo: 5,
      cupo_usado: 0,
      cupo_disponible: 5,
      plan: 'pro',
      estado: 'activo',
      suscripcion_expira_en: '2027-12-31T23:59:59.000Z',
    };
    unidades = [];
    alquileres = [];
    delegadosData = { activos: [], pendientes: [] };
  }

  // Guaranteed safe arrays
  delegadosData = {
    activos: Array.isArray(delegadosData?.activos) ? delegadosData.activos : [],
    pendientes: Array.isArray(delegadosData?.pendientes) ? delegadosData.pendientes : [],
  };

  // Subscription calculation (Gestor only)
  const now = new Date();
  const subscriptionEndsAt = (!isDelegado && cupo?.suscripcion_expira_en)
    ? new Date(cupo.suscripcion_expira_en)
    : null;
  const msInDay = 1000 * 60 * 60 * 24;

  let trialDaysRemaining = 0;
  if (subscriptionEndsAt) {
    trialDaysRemaining = Math.ceil(
      (subscriptionEndsAt.getTime() - now.getTime()) / msInDay
    );
  }

  const cupoUsado = cupo?.cupo_usado || 0;
  const cupoMaximo = cupo?.cupo_maximo || 1;
  const percentage = Math.round((cupoUsado / cupoMaximo) * 100);
  const cupoDisponible = cupo?.cupo_disponible || 0;

  const showWarningAlert =
    !isDelegado && subscriptionEndsAt && trialDaysRemaining <= 7 && trialDaysRemaining >= 0;
  const showCriticalAlert =
    !isDelegado && subscriptionEndsAt && (trialDaysRemaining < 0 || percentage >= 100);

  // Gauge color logic specified in specification
  const gaugeColor = showCriticalAlert
    ? '#F05252' // Rojo alerta
    : percentage >= 80 || (subscriptionEndsAt && trialDaysRemaining <= 7)
    ? '#E3A008' // Amarillo preventivo
    : '#1A56DB'; // Azul saludable

  const activeAlquileres = alquileres.filter((a) => a.estado === 'activo');
  const activeAlquileresCount = activeAlquileres.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-secondary animate-ping" />
            <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {tDash('terminalTitle')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
            {tDash('terminalSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreateUnidad && (
            <Link
              href={`/${locale}/mis-unidades/nueva`}
              className="px-4 py-2 min-h-[44px] flex items-center justify-center rounded-xl bg-primary text-white text-xs font-mono font-semibold shadow-sm hover:bg-primary/90 transition-all"
            >
              {tDash('newUnitBtn')}
            </Link>
          )}
          {isReadOnly && (
            <Badge data-testid="dashboard-readonly-badge" variant="outline" className="border-[#B89355] text-[#B89355] font-mono text-xs px-3 py-1.5 min-h-[44px] flex items-center">
              Modo Solo Lectura
            </Badge>
          )}
          {!isDelegado && (
            <Link
              href={`/${locale}/facturacion`}
              className="px-4 py-2 min-h-[44px] flex items-center justify-center rounded-xl bg-surface border border-border text-foreground text-xs font-mono font-semibold hover:bg-muted transition-all"
            >
              {tDash('buyQuotaBtn')}
            </Link>
          )}
        </div>
      </div>

      {/* Critical Alerts - Gestor Only */}
      {showCriticalAlert && (


        <div className="bg-destructive/10 text-destructive border border-destructive/25 rounded-2xl p-4 flex items-start gap-3 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider">
              {tDash('alertCriticalTitle')}
            </h4>
            <p className="text-xs leading-relaxed dark:text-rose-200">
              {trialDaysRemaining < 0
                ? tDash('alertCriticalExpired')
                : tDash('alertCriticalFull')}
            </p>
            <Link
              href={`/${locale}/facturacion`}
              className="inline-flex items-center min-h-[44px] text-xs font-semibold underline underline-offset-4 mt-1"
            >
              {tDash('goToBilling')}
            </Link>
          </div>
        </div>
      )}

      {showWarningAlert && !showCriticalAlert && (
        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 backdrop-blur-sm">
          <Clock className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider">
              {tDash('alertWarningTitle')}
            </h4>
            <p className="text-xs leading-relaxed dark:text-amber-200">
              {tDash('alertWarningMsg', { days: trialDaysRemaining })}
            </p>
            <Link
              href={`/${locale}/facturacion`}
              className="inline-flex items-center min-h-[44px] text-xs font-semibold underline underline-offset-4 mt-1"
            >
              {tDash('extendSubscription')}
            </Link>
          </div>
        </div>
      )}

      {/* Bento Grid Analytics */}
      <BentoGrid className="auto-rows-[19rem]">
        {/* 1. Cupo Gauge Widget or Delegado Scope Card */}
        {!isDelegado ? (
          <BentoGridItem
            title={tDash('quotaInUse')}
            description={tDash('quotaContracted', { max: cupoMaximo, disp: cupoDisponible })}
            badge={
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${gaugeColor}20`,
                  color: gaugeColor,
                }}
              >
                {percentage}% {tDash('quotaOccupancy')}
              </span>
            }
            icon={<Building2 className="h-5 w-5 text-primary" />}
            header={
              <div className="w-full h-full flex items-center justify-center p-2">
                <AnimatedCircularProgressBar
                  value={cupoUsado}
                  max={cupoMaximo}
                  gaugePrimaryColor={gaugeColor}
                  size={135}
                  strokeWidth={11}
                />
              </div>
            }
          />
        ) : (
          <BentoGridItem
            title="Alcance Asignado"
            description={`Acceso configurado: ${delegadoActivo?.scope?.alcanceTipo || (isDelegado ? 'pendiente' : 'cuenta')}`}
            badge={
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#B89355]/20 text-[#B89355]">
                {delegadoActivo?.permiso === 'gestionar' ? 'Gestionar' : 'Solo Lectura'}
              </span>
            }
            icon={<Building2 className="h-5 w-5 text-[#B89355]" />}
            header={
              <div className="w-full h-full flex flex-col justify-center p-4 bg-muted/30 rounded-xl font-mono">
                <div className="text-3xl font-extrabold text-foreground tracking-tight capitalize">
                  {delegadoActivo?.scope?.alcanceTipo || (isDelegado ? 'Pendiente' : 'Cuenta')}
                </div>
                <div className="text-xs text-muted-foreground mt-1 uppercase">
                  {delegadoActivo?.permiso === 'gestionar' ? 'Operación completa' : 'Solo visualización'}
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Unidades accesibles</span>
                  <span className="font-bold text-foreground">{unidades.length}</span>
                </div>
              </div>
            }
          />
        )}

        {/* 2. Alquileres Activos & Contratos */}
        <BentoGridItem
          title={tDash('activeRentals')}
          description={tDash('activeRentalsDesc')}
          badge={
            <span className="text-[10px] font-mono font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
              {tDash('activeBadge')}
            </span>
          }
          icon={<FileText className="h-5 w-5 text-secondary" />}
          header={
            <div className="w-full h-full flex flex-col justify-center p-4 bg-muted/30 rounded-xl font-mono">
              <div className="text-4xl font-extrabold text-foreground tracking-tight">
                {activeAlquileresCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1 uppercase">
                {tDash('activeRentalsOngoing')}
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{tDash('totalRegistered')}</span>
                <span className="font-bold text-foreground">{alquileres.length}</span>
              </div>
            </div>
          }
        />

        {/* 3. Terminal Financiero (Gestor) or Resumen Operativo (Delegado) */}
        {!isDelegado ? (
          <BentoGridItem
            title={tDash('billingTitle')}
            description={tDash('billingDesc')}
            badge={
              <span className="text-[10px] font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">
                {tDash('proBadge')}
              </span>
            }
            icon={<CreditCard className="h-5 w-5 text-primary" />}
            header={
              <div className="w-full h-full flex flex-col justify-center p-4 bg-primary/5 rounded-xl font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{tDash('statusLabel')}</span>
                  <span className="font-bold text-primary">
                    {subscriptionEndsAt
                      ? (trialDaysRemaining < 0 ? tDash('statusExpired') : tDash('statusActive'))
                      : tDash('statusTrial')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{tDash('expiryLabel')}</span>
                  <span className="font-bold text-foreground">
                    {subscriptionEndsAt ? tDash('daysRemaining', { days: trialDaysRemaining }) : 'N/A'}
                  </span>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/${locale}/facturacion`}
                    className="block w-full text-center py-2 min-h-[44px] flex items-center justify-center rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
                  >
                    {tDash('managePlanBtn')}
                  </Link>
                </div>
              </div>
            }
          />
        ) : (
          <BentoGridItem
            title="Inventario Accesible"
            description="Unidades asignadas en tu workspace"
            badge={
              <span className="text-[10px] font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">
                {unidades.length} {unidades.length === 1 ? 'Unidad' : 'Unidades'}
              </span>
            }
            icon={<Building2 className="h-5 w-5 text-primary" />}
            header={
              <div className="w-full h-full flex flex-col justify-center p-4 bg-primary/5 rounded-xl font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado Operativo</span>
                  <span className="font-bold text-primary">Activo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Alquileres Vigentes</span>
                  <span className="font-bold text-foreground">{activeAlquileresCount}</span>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/${locale}/mis-unidades`}
                    className="block w-full text-center py-2 min-h-[44px] flex items-center justify-center rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
                  >
                    Ver Unidades
                  </Link>
                </div>
              </div>
            }
          />
        )}
      </BentoGrid>

      {/* 4. Widgets Modulares en Grilla Responsive: Delegados y Registro de Actividad */}
      <div className={`grid grid-cols-1 ${!isDelegado ? 'lg:grid-cols-2' : ''} gap-6 pt-2`}>
        {/* WIDGET A: EQUIPO & DELEGADOS (Gestor Only) */}
        {!isDelegado && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-foreground font-sans">
                      Equipo &amp; Delegados
                    </h3>
                    <span className="text-[11px] text-muted-foreground dark:text-[#AEB7C7] font-mono block">
                      Gestión de permisos de colaboradores
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge variant="outline" className="font-mono text-xs bg-muted/50 border-border">
                    {delegadosData.activos.length} / 5 activos
                  </Badge>
                  <Link
                    href={`/${locale}/delegados`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>+ Invitar</span>
                  </Link>
                </div>
              </div>

              {/* Contenido de lista de delegados */}
              <div className="mt-4 space-y-3">
                {delegadosData.activos.length === 0 && delegadosData.pendientes.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed border-border/70 rounded-xl bg-muted/20">
                    <UserCheck className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground dark:text-[#AEB7C7] font-medium">
                      No tienes delegados asignados en tu workspace
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 dark:text-[#AEB7C7] mt-0.5">
                      Invita colaboradores para delegar la atención de unidades.
                    </p>
                  </div>
                ) : (
                  [
                    ...delegadosData.activos.map((d) => ({ ...d, isPending: false })),
                    ...delegadosData.pendientes.map((d) => ({ ...d, isPending: true })),
                  ].slice(0, 4).map((del) => (
                    <div
                      key={del.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                          {del.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {del.nombre || del.email}
                          </div>
                          <div className="text-[10px] text-muted-foreground dark:text-[#AEB7C7] truncate font-mono">
                            {del.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px] font-mono capitalize">
                          {del.rol_permiso || 'Gestionar'}
                        </Badge>
                        <span
                          className={`h-2 w-2 rounded-full ${del.isPending ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          title={del.isPending ? 'Invitación Pendiente' : 'Activo'}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 flex justify-end">
              <Link
                href={`/${locale}/delegados`}
                className="text-xs text-primary font-medium hover:underline inline-flex items-center min-h-[44px] gap-1 font-mono"
              >
                <span>Ver todos los delegados</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* WIDGET B: REGISTRO BREVE DE ACTIVIDAD */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-dorado-500/10 text-dorado-600 dark:text-dorado-400">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-foreground font-sans">
                    Registro de Actividad Reciente
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono block">
                    Movimientos y auditoría en tiempo real
                  </span>
                </div>
              </div>
              {!isDelegado && (
                <Link
                  href={`/${locale}/logs`}
                  className="text-xs text-primary hover:underline font-mono inline-flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 py-1"
                >
                  <span>Ver auditoría completa</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            {/* Feed cronológico vertical con eventos reales */}
            <div className="mt-4 space-y-3">
              {[
                ...(unidades[0]
                  ? [
                      {
                        title: `Unidad "${unidades[0].titulo_es || 'Publicada'}" actualizada`,
                        desc: `Estado operativo: ${unidades[0].estado || 'publicada'}`,
                        time: 'Hoy',
                        icon: <Home className="h-4 w-4 text-primary" />,
                      },
                    ]
                  : []),
                ...(activeAlquileres[0]
                  ? [
                      {
                        title: 'Alquiler Activo en Curso',
                        desc: `Contrato activo registrado con canon mensual`,
                        time: 'Reciente',
                        icon: <DollarSign className="h-4 w-4 text-emerald-500" />,
                      },
                    ]
                  : []),
                ...(!isDelegado && cupo
                  ? [
                      {
                        title: 'Auditoría de Cupo de Unidades',
                        desc: `${cupoUsado} de ${cupoMaximo} unidades en uso activo`,
                        time: '24/7',
                        icon: <Building2 className="h-4 w-4 text-dorado-600 dark:text-dorado-400" />,
                      },
                    ]
                  : []),
                {
                  title: 'Señas y Pagos Habilitados',
                  desc: 'Canal de cobro directo y registro de acuerdos',
                  time: 'Operativo',
                  icon: <CheckCircle2 className="h-4 w-4 text-secondary" />,
                },
              ].map((evt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-surface border border-border/60 shrink-0">
                      {evt.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{evt.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{evt.desc}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 pl-2">
                    {evt.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!isDelegado && (
            <div className="pt-2 border-t border-border/40 flex justify-end">
              <Link
                href={`/${locale}/logs`}
                className="text-xs text-primary font-medium hover:underline inline-flex items-center min-h-[44px] gap-1 font-mono"
              >
                <span>Registro de auditoría completo</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
