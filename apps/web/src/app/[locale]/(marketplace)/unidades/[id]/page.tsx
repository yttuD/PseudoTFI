import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { FavoritoButton } from '@/components/marketplace/FavoritoButton';
import { ReporteModal } from '@/components/marketplace/ReporteModal';
import { WhatsAppButton } from '@/components/marketplace/WhatsAppButton';

const Map = dynamic(() => import('@/components/marketplace/Map'), { ssr: false });

export default async function UnidadDetailPage({
  params: { id, locale }
}: {
  params: { id: string; locale: string }
}) {
  const t = await getTranslations('unidad');
  const tAuth = await getTranslations('auth');

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

  let unidad;
  let isFavorito = false;
  try {
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/unidades/${id}`, {
      headers,
      cache: 'no-store'
    });
    
    if (res.ok) {
      unidad = await res.json();
    } else {
      notFound();
    }

    if (session?.access_token) {
      const favRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favoritos`, {
        headers,
        cache: 'no-store'
      });
      if (favRes.ok) {
        const json = await favRes.json();
        const favs: Record<string, unknown>[] = json.data || [];
        isFavorito = favs.some((f: Record<string, unknown>) => f.unidad_id === id);
      }
    }
  } catch (error) {
    console.error("Failed to fetch unidad detail", error);
    notFound();
  }

  const isAuth = !!session;
  // Use exact location if available, otherwise fallback to Goya center for approximate zone
  const location = unidad.ubicacion_exacta || { lat: -29.1445, lng: -59.2645 };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Photos and Details */}
        <div className="space-y-6">
          <div className="aspect-[4/3] bg-muted rounded-xl overflow-hidden relative">
            {unidad.fotos && unidad.fotos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={unidad.fotos[0]} alt={unidad.titulo || unidad.titulo_es} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                {t('sinFotos')}
              </div>
            )}
            <Badge className="absolute top-4 left-4" variant="secondary">
              {unidad.zonas?.nombre}
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {unidad.fotos?.slice(1, 5).map((foto: string, idx: number) => (
              <div key={idx} className="aspect-square bg-muted rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto} alt={`Foto ${idx+2}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{unidad.zonas?.nombre} · {unidad.categoria}</span>
              </div>
              <div className="flex items-center gap-2">
                <ReporteModal 
                  unidadId={id} 
                  isLoggedIn={isAuth} 
                  token={session?.access_token} 
                />
                <FavoritoButton 
                  unidadId={id} 
                  initialIsFavorito={isFavorito} 
                  isLoggedIn={isAuth} 
                  token={session?.access_token} 
                  showText 
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-4">{unidad.titulo || unidad.titulo_es}</h1>
            <p className="text-muted-foreground whitespace-pre-wrap">{unidad.descripcion || unidad.descripcion_es}</p>
          </div>
        </div>

        {/* Right Column: Pricing, Contact & Map */}
        <div className="space-y-6">
          <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold text-primary mb-4">Modalidades de Precio</h2>
            {unidad.modalidades_precio?.length > 0 ? (
              <ul className="space-y-3 mb-6">
                {unidad.modalidades_precio.map((m: {id: string, tipo_periodo: string, precio: number}) => (
                  <li key={m.id} className="flex justify-between items-center pb-3 border-b border-border last:border-0 last:pb-0">
                    <span className="font-medium">{m.tipo_periodo === 'mensual' ? 'Mensual' : 'Por día'}</span>
                    <span className="font-bold text-lg">${m.precio}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mb-6">Consultar precio</p>
            )}

            <WhatsAppButton 
              telefono={unidad.whatsapp || ''} 
              titulo={unidad.titulo || unidad.titulo_es} 
              className={buttonVariants({ variant: "default", className: "w-full gap-2" })} 
            />
          </div>

          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden h-80 flex flex-col relative">
            <div className="p-4 bg-background border-b border-border z-10 relative">
              <h3 className="font-semibold">{t('verUbicacion')}</h3>
            </div>
            <div className="flex-1 relative z-0">
              <Map location={location} exact={!!unidad.ubicacion_exacta} />
            </div>
            
            {!isAuth && (
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="rounded-lg border border-border bg-background/95 backdrop-blur-sm p-4 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-sm">{tAuth('loginRequerido')}</span>
                  </div>
                  <Link 
                    href={`/${locale}/auth/login`}
                    className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0 bg-background" })}
                  >
                    Ingresar
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
