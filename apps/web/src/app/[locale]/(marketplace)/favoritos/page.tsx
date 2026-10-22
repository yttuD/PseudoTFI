import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heart, Compass, AlertCircle, RefreshCw } from 'lucide-react';
import { CardUnidad } from '@/components/marketplace/CardUnidad';

export default async function FavoritosPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const tFav = await getTranslations('Favoritos');
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

  // La sesión la resuelve el adaptador común; no se inventa un token dev.
  const { accessToken: token } = await getServerAuth(cookieStore, supabase);
  const loginUrl = `/${locale}/auth/login?portal=marketplace&next=/${locale}/favoritos`;
  if (!token) redirect(loginUrl);

  // 2. Si está logueado, consultar GET /favoritos
  let favoritos: Record<string, unknown>[] = [];
  let favoritosLoadError = false;
  let sessionExpired = false;
  if (token) {
    try {
      const qParams = new URLSearchParams();
      if (searchParams) {
        Object.entries(searchParams).forEach(([k, v]) => {
          if (typeof v === 'string') qParams.set(k, v);
        });
      }
      const qs = qParams.toString() ? `?${qParams.toString()}` : '';
      const favRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favoritos${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });
      if (favRes.status === 401) {
        sessionExpired = true;
      } else if (!favRes.ok) {
        favoritosLoadError = true;
      } else {
        const favData: unknown = await favRes.json();
        const favList = Array.isArray(favData)
          ? favData
          : favData && typeof favData === 'object' && 'data' in favData && Array.isArray(favData.data)
            ? favData.data
            : null;
        if (!favList) throw new Error('Invalid favorites response');
        favoritos = favList
          .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
          .map((entry) => (entry.unidad || entry) as Record<string, unknown>)
          .filter(Boolean);
      }
    } catch (e) {
      console.error('Error fetching favoritos:', e);
      favoritosLoadError = true;
    }
  }

  if (sessionExpired) redirect(loginUrl);

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-border/80 mb-8">
          <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Heart className="h-5 w-5 fill-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{tFav('title')}</h1>
            <p className="text-xs text-muted-foreground">
              {tFav('description')}
            </p>
          </div>
        </div>

        {/* Content */}
        {favoritosLoadError ? (
          <div role="alert" data-testid="favorites-load-error" className="max-w-md mx-auto my-12 text-center p-8 rounded-3xl bg-surface border border-destructive/30">
            <AlertCircle aria-hidden="true" className="h-8 w-8 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-bold text-foreground mb-2">{tFav('loadErrorTitle')}</h2>
            <p className="text-sm text-muted-foreground mb-5">{tFav('loadErrorDescription')}</p>
            <Link href={`/${locale}/favoritos${searchParams ? `?${new URLSearchParams(Object.entries(searchParams).filter((entry): entry is [string, string] => typeof entry[1] === 'string')).toString()}` : ''}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-primary-foreground font-semibold focus-visible:ring-2 focus-visible:ring-ring">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              {tFav('retry')}
            </Link>
          </div>
        ) : favoritos.length === 0 ? (
          <div className="max-w-md mx-auto my-12 text-center p-8 rounded-3xl bg-surface border border-border/80 shadow-glass">
            <div className="h-14 w-14 rounded-2xl bg-muted/60 text-muted-foreground/40 flex items-center justify-center mx-auto mb-4 border border-border/40">
              <Heart className="h-7 w-7 stroke-[1.5]" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">{tFav('emptyTitle')}</h2>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              {tFav('emptyDescription')}
            </p>
            <Link
              id="btn-explorar-unidades"
              href={`/${locale}/unidades`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-dorado-500 hover:bg-dorado-600 text-azul-950 font-semibold text-xs shadow-md shadow-dorado-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass className="h-4 w-4" />
              <span>{tFav('explore')}</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoritos.map((u) => (
              <CardUnidad
                key={u.id as string}
                unidad={u}
                locale={locale}
                isFavorito={true}
                isLoggedIn={true}
                token={token}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
