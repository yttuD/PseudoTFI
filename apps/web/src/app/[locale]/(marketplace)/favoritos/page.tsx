import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heart, Compass } from 'lucide-react';
import { CardUnidad } from '@/components/marketplace/CardUnidad';

export default async function FavoritosPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
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

  let token: string | undefined;
  let isAuth = false;

  try {
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

    isAuth = !!session || !!authCookie;
    token = session?.access_token;
    if (!token && authCookie) {
      try {
        const parsed = JSON.parse(atob(authCookie.replace('base64-', '')));
        token = parsed.access_token;
      } catch {
        token = 'dev-access-token';
      }
    }
  } catch {}

  // 1. Si no está autenticado, redirigir a login preservando next
  if (!isAuth) {
    redirect(`/${locale}/auth/login?portal=marketplace&next=/${locale}/favoritos`);
  }

  // 2. Si está logueado, consultar GET /favoritos
  let favoritos: Record<string, unknown>[] = [];
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
        signal: AbortSignal.timeout(2000),
      });
      if (favRes.ok) {
        const favData = await favRes.json();
        const favList = Array.isArray(favData) ? favData : favData?.data || [];
        favoritos = favList.map((f: Record<string, unknown>) => (f.unidad || f) as Record<string, unknown>).filter(Boolean);
      }
    } catch (e) {
      console.error('Error fetching favoritos:', e);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-border/80 mb-8">
          <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Heart className="h-5 w-5 fill-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Favoritos</h1>
            <p className="text-xs text-muted-foreground">
              Unidades que guardaste para consultar o comparar más tarde.
            </p>
          </div>
        </div>

        {/* Content */}
        {favoritos.length === 0 ? (
          <div className="max-w-md mx-auto my-12 text-center p-8 rounded-3xl bg-surface border border-border/80 shadow-glass">
            <div className="h-14 w-14 rounded-2xl bg-muted/60 text-muted-foreground/40 flex items-center justify-center mx-auto mb-4 border border-border/40">
              <Heart className="h-7 w-7 stroke-[1.5]" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Aún no tienes favoritos guardados</h2>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Explora el catálogo y guarda las unidades que te interesen para consultarlas luego
            </p>
            <Link
              id="btn-explorar-unidades"
              href={`/${locale}/unidades`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-dorado-500 hover:bg-dorado-600 text-azul-950 font-semibold text-xs shadow-md shadow-dorado-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass className="h-4 w-4" />
              <span>Explorar Unidades</span>
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
