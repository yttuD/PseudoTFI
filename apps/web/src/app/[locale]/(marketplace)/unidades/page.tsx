import { getTranslations } from 'next-intl/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CardUnidad } from '@/components/marketplace/CardUnidad';

export default async function UnidadesPage({
  params: { locale },
  searchParams
}: {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tComun = await getTranslations('comun');
  
  // Construct search query
  const query = new URLSearchParams();
  if (searchParams.categoria) query.set('categoria', searchParams.categoria as string);
  if (searchParams.zona_id) query.set('zona_id', searchParams.zona_id as string);
  if (searchParams.precio_max) query.set('precio_max', searchParams.precio_max as string);
  
  let unidades = [];
  let favIds = new Set<string>();
  let isAuth = false;
  let token: string | undefined;

  try {
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

    const { data: { session } } = await supabase.auth.getSession();
    isAuth = !!session;
    token = session?.access_token;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/unidades?${query.toString()}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      unidades = Array.isArray(data) ? data : (data?.data || []);
    }

    if (token) {
      const favRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favoritos`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (favRes.ok) {
        const json = await favRes.json();
        const favs: Record<string, unknown>[] = json.data || [];
        favIds = new Set(favs.map(f => f.unidad_id as string));
      }
    }
  } catch (error) {
    console.error("Failed to fetch unidades", error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filtros Desktop (Simplified) */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white border border-border p-4 rounded-xl sticky top-4">
            <h3 className="font-semibold mb-4">Filtros</h3>
            {/* Filter inputs would go here */}
            <p className="text-sm text-muted-foreground">Filtros aplicados:</p>
            <ul className="text-sm mt-2 space-y-1">
              {searchParams.categoria && <li>Categoría: {searchParams.categoria}</li>}
              {searchParams.zona_id && <li>Zona ID: {searchParams.zona_id}</li>}
              {searchParams.precio_max && <li>Precio Máx: ${searchParams.precio_max}</li>}
              {!searchParams.categoria && !searchParams.zona_id && !searchParams.precio_max && (
                <li className="text-muted-foreground">Ninguno</li>
              )}
            </ul>
          </div>
        </div>

        {/* Grid Resultados */}
        <div className="flex-1">
          {unidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-white rounded-xl border border-border">
              <p className="text-lg">{tComun('sinResultados')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
