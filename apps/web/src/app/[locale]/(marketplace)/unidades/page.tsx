import { getTranslations } from 'next-intl/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CardUnidad } from '@/components/marketplace/CardUnidad';
import { MarketplaceFiltrosSidebar } from '@/components/marketplace/MarketplaceFiltrosSidebar';
import type { ExchangeRates } from '@/lib/public-price';

export default async function UnidadesPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tComun = await getTranslations('comun');
  const tCatalogo = await getTranslations('Catalogo');

  // Construir query string para la API con todos los filtros combinables
  const query = new URLSearchParams();
  if (searchParams.categoria) query.set('categoria', searchParams.categoria as string);
  if (searchParams.zona_id) query.set('zona_id', searchParams.zona_id as string);
  if (searchParams.precio_min) query.set('precio_min', searchParams.precio_min as string);
  if (searchParams.precio_max) query.set('precio_max', searchParams.precio_max as string);
  if (searchParams.q) query.set('q', searchParams.q as string);
  query.set('locale', locale);

  let unidades = [];
  let favIds = new Set<string>();
  let isAuth = false;
  let token: string | undefined;
  let catalogError = false;
  let catalogFetched = false;
  let exchangeRates: ExchangeRates | null = null;
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
      const results = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : null;
      if (!results) throw new Error('Invalid marketplace catalog response');
      unidades = results;
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

  if (locale === 'en' || locale === 'pt') {
    try {
      const ratesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/cotizaciones`, {
        cache: 'no-store', signal: AbortSignal.timeout(5500),
      });
      if (ratesResponse.ok) exchangeRates = await ratesResponse.json();
    } catch {
      exchangeRates = null;
    }
  }

  // An empty successful API response is a genuine empty catalog even in dev.
  // Test fixtures belong exclusively to the isolated mock API; never inject
  // synthetic listings, prices or contact details into the product UI.

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filtros Desktop interactivo */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <MarketplaceFiltrosSidebar collapsedOnMobile />
        </div>

        {/* Grid Resultados */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {tCatalogo('titulo')}
            </h1>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/40">
              {catalogError ? tCatalogo('servicioNoDisponible') : `${unidades.length} ${unidades.length === 1 ? tCatalogo('unidadEncontrada') : tCatalogo('unidadesEncontradas')}`}
            </span>
          </div>

          {catalogError ? (
            <div role="alert" className="flex flex-col items-center justify-center py-8 sm:py-20 text-center px-4 bg-card rounded-2xl border border-border/60">
              <p className="text-base font-semibold text-foreground">{tCatalogo('errorTitulo')}</p>
              <p className="text-sm text-muted-foreground mt-2">{tCatalogo('errorDescripcion')}</p>
              <a href={`/${locale}/unidades?${query.toString()}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-primary-foreground">{tCatalogo('reintentar')}</a>
            </div>
          ) : unidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-2xl border border-border/60 shadow-sm text-center px-4">
              <p className="text-base font-semibold text-foreground">{tComun('sinResultados')}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {tCatalogo('sinResultadosDescripcion')}
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
                  exchangeRates={exchangeRates}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
