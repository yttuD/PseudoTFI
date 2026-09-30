import { getTranslations } from 'next-intl/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CardUnidad } from '@/components/marketplace/CardUnidad';
import { MarketplaceFiltrosSidebar } from '@/components/marketplace/MarketplaceFiltrosSidebar';

export default async function UnidadesPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tComun = await getTranslations('comun');

  // Construir query string para la API con todos los filtros combinables
  const query = new URLSearchParams();
  if (searchParams.categoria) query.set('categoria', searchParams.categoria as string);
  if (searchParams.zona_id) query.set('zona_id', searchParams.zona_id as string);
  if (searchParams.precio_min) query.set('precio_min', searchParams.precio_min as string);
  if (searchParams.precio_max) query.set('precio_max', searchParams.precio_max as string);
  if (searchParams.q) query.set('q', searchParams.q as string);

  let unidades = [];
  let favIds = new Set<string>();
  let isAuth = false;
  let token: string | undefined;
  let catalogError = false;
  let catalogFetched = false;
  const releaseMode = process.env.NODE_ENV === 'production' || process.env.RENDO_BETA_MODE === 'true';

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    let session = null;
    try {
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 400)
      );
      const sessionRes = await Promise.race([sessionPromise, sessionTimeout]);
      session = sessionRes.data?.session;
    } catch {
      session = null;
    }
    const authCookie =
      cookieStore.get('sb-localhost-auth-token')?.value ||
      cookieStore.get('sb-127-auth-token')?.value ||
      cookieStore.get('sb-auth-token')?.value;
    isAuth = !!session || (!releaseMode && !!authCookie);
    token = session?.access_token;
    if (!releaseMode && !token && authCookie) {
      try {
        const parsed = JSON.parse(atob(authCookie.replace('base64-', '')));
        token = parsed.access_token;
      } catch {
        token = 'dev-access-token';
      }
    }

    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/marketplace/unidades?${query.toString()}`;
    const res = await fetch(apiUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(releaseMode ? 8000 : 1500),
    });
    if (res.ok) {
      const data = await res.json();
      unidades = Array.isArray(data) ? data : data?.data || [];
      catalogFetched = true;
    } else {
      catalogError = true;
    }

    if (token) {
      const favRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favoritos`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(1200),
      });
      if (favRes.ok) {
        const json = await favRes.json();
        const favList: Record<string, unknown>[] = Array.isArray(json) ? json : json?.data || [];
        favIds = new Set(favList.map((f) => (f.id || f.unidad_id) as string).filter(Boolean));
      }
    }
  } catch (error) {
    console.error('Failed to fetch unidades', error);
    catalogError = !catalogFetched;
  }

  // Fallback si no hay unidades y no hay ningún filtro aplicado
  const hayFiltros = !!(
    searchParams.categoria ||
    searchParams.zona_id ||
    searchParams.precio_min ||
    searchParams.precio_max ||
    searchParams.q
  );

  if (!releaseMode && !catalogError && unidades.length === 0 && !hayFiltros) {
    unidades = [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        titulo: 'Departamento 2 Ambientes Frente al Río',
        titulo_es: 'Departamento 2 Ambientes Frente al Río',
        categoria: 'departamento',
        fotos: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
        ],
        modalidades_precio: [{ id: 'm1', precio: 45000, tipo_periodo: 'mensual' }],
        whatsapp: '+5493777123456',
      },
    ];
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filtros Desktop interactivo */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <MarketplaceFiltrosSidebar collapsedOnMobile={catalogError} />
        </div>

        {/* Grid Resultados */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Catálogo de Unidades Disponibles
            </h1>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/40">
              {catalogError ? 'Servicio no disponible' : `${unidades.length} ${unidades.length === 1 ? 'unidad encontrada' : 'unidades encontradas'}`}
            </span>
          </div>

          {catalogError ? (
            <div role="alert" className="flex flex-col items-center justify-center py-8 sm:py-20 text-center px-4 bg-card rounded-2xl border border-border/60">
              <p className="text-base font-semibold text-foreground">El catálogo no está disponible temporalmente</p>
              <p className="text-sm text-muted-foreground mt-2">Tus filtros se conservarán al reintentar.</p>
              <a href={`/${locale}/unidades?${query.toString()}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-primary-foreground">Reintentar</a>
            </div>
          ) : unidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-2xl border border-border/60 shadow-sm text-center px-4">
              <p className="text-base font-semibold text-foreground">{tComun('sinResultados')}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No encontramos unidades que coincidan con los criterios de búsqueda seleccionados. Prueba ajustar o limpiar los filtros.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {unidades.map((u: Record<string, unknown>) => (
                <CardUnidad
                  key={u.id as string}
                  unidad={u}
                  locale={locale}
                  isFavorito={favIds.has(u.id as string)}
                  isLoggedIn={isAuth}
                  token={token}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
