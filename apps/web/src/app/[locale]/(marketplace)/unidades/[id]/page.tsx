import React from 'react';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { WhatsAppButton } from '@/components/marketplace/WhatsAppButton';
import { TrackUnidadView } from '@/components/marketplace/TrackUnidadView';
import { FavoritoButton } from '@/components/marketplace/FavoritoButton';
import { ReporteModal } from '@/components/marketplace/ReporteModal';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { AnimatedTabs, TabItem } from '@/components/ui/tabs';
import {
  Lock,
  Check,
  MapPin,
  Sparkles,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';

const Map = dynamic(() => import('@/components/marketplace/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-muted animate-pulse rounded-2xl flex items-center justify-center text-muted-foreground text-sm font-mono">
      Iniciando geolocalización...
    </div>
  )
});

export default async function UnidadDetailPage({
  params: { id, locale }
}: {
  params: { id: string; locale: string }
}) {
  const t = await getTranslations('unidad');
  const tDetail = await getTranslations('UnitDetail');

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        }
      }
    }
  );

  const { user, accessToken } = await getServerAuth(cookieStore, supabase);
  const isAuth = !!user;
  const releaseMode = process.env.NODE_ENV === 'production' || process.env.RENDO_BETA_MODE === 'true';

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let unidad;
  let isFavorito = false;
  let detailUnavailable = false;
  let detailMissing = false;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/unidades/${id}`, {
      headers,
      cache: 'no-store'
    });

    if (!res.ok) {
      if (releaseMode) {
        detailMissing = res.status === 404;
        detailUnavailable = !detailMissing;
      } else if (id.includes('a0000000-0000-0000-0000-000000000001')) {
        unidad = {
          id: 'a0000000-0000-0000-0000-000000000001',
          titulo: 'Departamento 2 Ambientes Frente al Río',
          titulo_es: 'Departamento 2 Ambientes Frente al Río',
          descripcion: 'Departamento completamente equipado con vista panorámica y cochera.',
          descripcion_es: 'Departamento completamente equipado con vista panorámica y cochera.',
          categoria: 'departamento',
          fotos: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
          ],
          ubicacion_aprox: { lat: -29.1445, lng: -59.2645 },
          ubicacion_exacta: isAuth ? { lat: -29.1445, lng: -59.2645 } : null,
          whatsapp: '+5493777123456',
          modalidades_precio: [{ id: 'm1', precio: 45000, tipo_periodo: 'mensual' }],
        };
      } else {
        detailMissing = true;
      }
    } else {
      const data = await res.json();
      unidad = data.data || data;
    }

    if (headers['Authorization'] && unidad) {
      const favRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favoritos`, {
        headers,
        cache: 'no-store'
      });
      if (favRes.ok) {
        const json = await favRes.json();
        const favList: Record<string, unknown>[] = Array.isArray(json) ? json : json?.data || [];
        isFavorito = favList.some((f: Record<string, unknown>) => f.id === id || f.unidad_id === id);
      }
    }
  } catch (error) {
    if (unidad) {
      console.warn('Failed to fetch optional favorite state', error);
    } else if (releaseMode) {
      detailUnavailable = true;
    } else if (id.includes('a0000000-0000-0000-0000-000000000001')) {
      unidad = {
        id: 'a0000000-0000-0000-0000-000000000001',
        titulo: 'Departamento 2 Ambientes Frente al Río',
        titulo_es: 'Departamento 2 Ambientes Frente al Río',
        descripcion: 'Departamento completamente equipado con vista panorámica y cochera.',
        descripcion_es: 'Departamento completamente equipado con vista panorámica y cochera.',
        categoria: 'departamento',
        fotos: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
        ],
        ubicacion_aprox: { lat: -29.1445, lng: -59.2645 },
        ubicacion_exacta: isAuth ? { lat: -29.1445, lng: -59.2645 } : null,
        whatsapp: '+5493777123456',
        modalidades_precio: [{ id: 'm1', precio: 45000, tipo_periodo: 'mensual' }],
      };
    } else {
      console.error("Failed to fetch unidad detail", error);
      detailMissing = true;
    }
  }

  if (detailMissing) notFound();
  if (detailUnavailable || !unidad) {
    return (
      <div role="alert" className="container mx-auto my-12 max-w-2xl rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <h1 className="text-xl font-bold text-foreground">El detalle no está disponible temporalmente</h1>
        <p className="mt-2 text-sm text-muted-foreground">No se mostrará información de ejemplo mientras el servicio esté caído.</p>
        <Link href={`/${locale}/unidades`} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-primary-foreground">Volver al catálogo</Link>
      </div>
    );
  }

  const location = unidad.ubicacion_exacta || unidad.ubicacion_aprox || { lat: -29.1445, lng: -59.2645 };

  const caracteristicas = unidad.caracteristicas && typeof unidad.caracteristicas === 'object'
    ? Object.entries(unidad.caracteristicas as Record<string, unknown>)
    : [];

  const detailTabs: TabItem[] = [
    {
      title: tDetail('tabDescription'),
      value: "descripcion",
      content: (
        <div className="space-y-6 pt-2">
          <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed font-normal">
            {unidad.descripcion || unidad.descripcion_es || t('sinFotos')}
          </p>

          {caracteristicas.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {tDetail('amenitiesTitle')}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {caracteristicas.map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/60 text-xs"
                  >
                    <Check className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span className="font-medium text-foreground capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-muted-foreground">
                      {typeof val === 'boolean' ? (val ? 'Sí' : 'No') : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: tDetail('tabPricing'),
      value: "modalidades",
      content: (
        <div className="space-y-4 pt-2">
          {unidad.modalidades_precio?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {unidad.modalidades_precio.map((m: { id: string; tipo_periodo: string; precio: number }) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/80 backdrop-blur-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
                      {m.tipo_periodo === 'mensual' ? tDetail('monthlyRental') : tDetail('dailyRental')}
                    </span>
                    <FileCheck className="h-4 w-4 text-secondary" />
                  </div>
                  <div className="font-black text-2xl md:text-3xl font-mono text-foreground">
                    ${m.precio.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ARS</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {tDetail('directPaymentNote')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl bg-muted/40 text-xs text-muted-foreground">
              {tDetail('customPricingNote')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: tDetail('tabRules'),
      value: "reglas",
      content: (
        <div className="space-y-4 pt-2 text-xs md:text-sm text-muted-foreground">
          <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2.5">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <span>{tDetail('leaseConditionsTitle')}</span>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
              <li>{tDetail('rule1')}</li>
              <li>{tDetail('rule2')}</li>
              <li>{tDetail('rule3')}</li>
              <li>{tDetail('rule4')}</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full min-h-screen bg-background">
      <TrackUnidadView unidadId={id} />
      {/* Hero Image Gallery */}
      <div className="w-full h-[45vh] md:h-[60vh] relative bg-muted group">
        {unidad.fotos && unidad.fotos.length > 0 ? (
          <div className="absolute inset-0 grid grid-cols-4 gap-1">
            <div className={unidad.fotos.length > 1 ? "col-span-4 md:col-span-2 lg:col-span-3 relative overflow-hidden" : "col-span-4 relative overflow-hidden"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={unidad.fotos[0]}
                alt={unidad.titulo || unidad.titulo_es}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
            {unidad.fotos.length > 1 && (
              <div className="hidden md:grid col-span-2 lg:col-span-1 grid-rows-2 gap-1">
                {unidad.fotos.slice(1, 3).map((foto: string, idx: number) => (
                  <div key={idx} className="relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto}
                      alt={`Foto ${idx + 2}`}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                  </div>
                ))}
                {unidad.fotos.length === 2 && <div className="bg-muted/50 w-full h-full" />}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground bg-muted">
            {t('sinFotos')}
          </div>
        )}

        {/* Floating Top Nav within Hero */}
        <div className="absolute top-6 w-full">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <Badge className="bg-background/90 text-foreground backdrop-blur-md px-4 py-1.5 shadow-glass border-none font-mono tracking-wide text-xs">
              {unidad.zonas?.nombre} • {unidad.categoria}
            </Badge>
            <div className="flex gap-2">
              <FavoritoButton
                unidadId={id}
                initialIsFavorito={isFavorito}
                isLoggedIn={isAuth}
                token={accessToken || undefined}
                className="bg-background/90 backdrop-blur-md shadow-glass border-none hover:bg-background"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-12 max-w-6xl relative -mt-16 md:-mt-24 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Details with Aceternity Tabs */}
          <div className="lg:col-span-2 space-y-8 bg-surface/95 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-glass border border-border/70">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-secondary/15 text-secondary border border-secondary/30 gap-1.5 py-1 px-3 shadow-sm">
                  <FileCheck className="w-3.5 h-3.5" /> {tDetail('publishedUnit')}
                </Badge>
                <ReporteModal
                  unidadId={id}
                  isLoggedIn={isAuth}
                  token={accessToken || undefined}
                />
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight leading-[1.15] text-foreground">
                {unidad.titulo || unidad.titulo_es}
              </h1>
            </div>

            {/* Aceternity Animated Tabs */}
            <AnimatedTabs tabs={detailTabs} defaultValue="descripcion" />

            <hr className="border-border/60" />

            {/* Map Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <MapPin className="text-primary h-5 w-5" />
                  <span>{tDetail('osmTitle')}</span>
                </h3>
              </div>
              <div className="border border-border/80 rounded-2xl overflow-hidden h-80 relative shadow-sm">
                <Map
                  location={location}
                  exact={isAuth && !!unidad.ubicacion_exacta}
                  titulo={unidad.titulo || unidad.titulo_es}
                  categoria={unidad.categoria}
                />
                {!isAuth && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                    <div className="bg-surface/95 p-6 rounded-2xl shadow-glass flex flex-col items-center text-center gap-3 max-w-sm border border-border mx-4">
                      <Lock className="w-7 h-7 text-primary" />
                      <p className="text-xs sm:text-sm font-medium text-foreground">
                        Ubicación aproximada. Inicia sesión para ver la ubicación exacta.
                      </p>
                      <Link
                        href={`/${locale}/auth/login?portal=marketplace&next=/${locale}/unidades/${id}`}
                        className={buttonVariants({ variant: "default", className: "w-full min-h-[44px] h-11 text-xs rounded-xl" })}
                      >
                        {tDetail('loginButton')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky CTA Panel */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
            <div className="bg-surface border border-border/80 p-6 md:p-8 rounded-3xl shadow-glass">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-dorado-700 dark:text-dorado-300" />
                <h2 className="text-lg font-bold text-foreground">{tDetail('pricingValuesTitle')}</h2>
              </div>

              {unidad.modalidades_precio?.length > 0 ? (
                <ul className="space-y-4 mb-8">
                  {unidad.modalidades_precio.map((m: { id: string; unidad_tiempo: string; precio: number }) => (
                    <li key={m.id} className="flex flex-col gap-1 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                      <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                        {m.unidad_tiempo === 'mes' ? tDetail('monthlyRental') : m.unidad_tiempo === 'hora' ? tDetail('hourlyRental') : tDetail('dailyRental')}
                      </span>
                      <span className="font-black text-2xl md:text-3xl font-mono text-foreground">
                        <span className="text-lg text-muted-foreground mr-1">$</span>
                        {m.precio.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-6 text-center bg-muted/40 rounded-2xl mb-8">
                  <p className="text-muted-foreground font-mono uppercase tracking-widest text-xs">
                    {tDetail('consultPrice')}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {isAuth && (unidad.whatsapp || unidad.telefono) ? (
                  <WhatsAppButton
                    telefono={unidad.whatsapp || unidad.telefono}
                    whatsapp={unidad.whatsapp || unidad.telefono}
                    titulo={unidad.titulo || unidad.titulo_es}
                    unidadId={id}
                  />
                ) : isAuth ? (
                  <p className="text-center text-sm text-muted-foreground">Contacto no disponible para esta unidad.</p>
                ) : (
                  <Link href={`/${locale}/auth/login?portal=marketplace&next=/${locale}/unidades/${id}`}
                    className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                    Iniciá sesión para contactar
                  </Link>
                )}
                <p className="text-[11px] text-center text-muted-foreground font-medium px-2">
                  {tDetail('directContactDisclaimer')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
