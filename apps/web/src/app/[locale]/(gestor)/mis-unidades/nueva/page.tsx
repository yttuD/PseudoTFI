import { UnidadForm } from '@/components/gestor/UnidadForm';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerAuth } from '@/lib/supabase/server-auth';

export default async function NuevaUnidadPage({ params: { locale } }: { params: { locale: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        }
      }
    }
  );

  const { user, accessToken } = await getServerAuth(cookieStore, supabase);
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { getServerAccessContext } = await import('@/lib/access-context');
  const accessContext = await getServerAccessContext(accessToken);
  const canCreate =
    accessContext?.actor === 'gestor' ||
    (accessContext?.actor === 'delegado' &&
      accessContext.state === 'activo' &&
      accessContext.permiso === 'gestionar' &&
      (accessContext.scope.alcanceTipo === 'cuenta' || accessContext.scope.alcanceTipo === 'grupo'));

  if (!canCreate) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 space-y-6" data-testid="denial-feedback-container">
        <div
          data-testid="denial-feedback-banner"
          className="p-6 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300 font-sans shadow-sm flex flex-col gap-3 min-h-[44px]"
        >
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs uppercase px-2.5 py-1 rounded bg-red-500/20 font-bold tracking-wider">
              Error 403
            </span>
            <span className="font-semibold text-base text-red-900 dark:text-red-100">
              Acceso Denegado: Permisos Insuficientes
            </span>
          </div>
          <p className="text-sm leading-relaxed text-red-800 dark:text-red-200">
            El rol Delegado con permiso &ldquo;ver&rdquo; tiene restringida la creación de nuevas unidades en este espacio de trabajo. Tus permisos asignados son exclusivamente de lectura.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link
              href={`/${locale}/mis-unidades`}
              className="inline-flex items-center justify-center rounded-xl font-medium transition-colors bg-background border border-border hover:bg-accent hover:text-accent-foreground min-h-[44px] min-w-[44px] px-4 text-xs font-semibold text-foreground shadow-xs"
            >
              Volver al Inventario
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch Zonas
  let zonas = [];
  try {
    const zonasRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/zonas`, { cache: 'no-store' });
    if (zonasRes.ok) zonas = await zonasRes.json();
  } catch (e) {
    console.error("Error fetching zonas", e);
  }

  // Fetch Grupos
  let grupos = [];
  try {
    const gruposRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/grupos`, {
      headers: { Authorization: `Bearer ${accessToken || ''}` },
      cache: 'no-store'
    });
    if (gruposRes.ok) {
      const gJson = await gruposRes.json();
      grupos = Array.isArray(gJson) ? gJson : (gJson.data || []);
      if (accessContext?.actor === 'delegado' && accessContext.state === 'activo' && accessContext.scope.alcanceTipo === 'grupo') {
        const assignedGrupoId = accessContext.scope.grupoId;
        grupos = grupos.filter((g: { id?: string }) => g.id === assignedGrupoId);
      }
    }
  } catch (e) {
    console.error("Error fetching grupos", e);
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Nueva Unidad
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Completá los datos técnicos, ficha comercial y ubicación de tu unidad.
          </p>
        </div>
      </div>

      <UnidadForm 
        locale={locale} 
        zonas={zonas} 
        token={accessToken || ''} 
        grupos={grupos}
      />
    </div>
  );
}
