'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Filter, Building2, MapPin, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { CATEGORIAS_UNIDAD, categoriaLabel } from '@/lib/categorias';
import { useLocale, useTranslations } from 'next-intl';

const CATEGORIAS = [{ value: '' }, ...CATEGORIAS_UNIDAD];

export function MarketplaceFiltrosSidebar({ collapsedOnMobile = false }: { collapsedOnMobile?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('CatalogoFiltros');
  const currency = locale === 'en' ? 'USD' : locale === 'pt' ? 'BRL' : 'ARS';

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [categoria, setCategoria] = useState(searchParams.get('categoria') || '');
  const [zonaId, setZonaId] = useState(searchParams.get('zona_id') || '');
  const [precioMin, setPrecioMin] = useState(searchParams.get('precio_min') || '');
  const [precioMax, setPrecioMax] = useState(searchParams.get('precio_max') || '');
  const [zonas, setZonas] = useState<{ id: string | number; nombre: string }[]>([]);
  const [mobileOpen, setMobileOpen] = useState(!collapsedOnMobile);
  const precioMaxRef = useRef<HTMLInputElement>(null);

  // Los chips representan los filtros realmente aplicados (URL), no el borrador.
  const applied = {
    q: searchParams.get('q') || '',
    categoria: searchParams.get('categoria') || '',
    zonaId: searchParams.get('zona_id') || '',
    precioMin: searchParams.get('precio_min') || '',
    precioMax: searchParams.get('precio_max') || '',
  };
  const hayFiltrosAplicados = Object.values(applied).some(Boolean);
  const totalFiltrosAplicados = Object.values(applied).filter(Boolean).length;
  const hayCambiosSinAplicar = q.trim() !== applied.q || categoria !== applied.categoria
    || zonaId !== applied.zonaId || precioMin !== applied.precioMin || precioMax !== applied.precioMax;
  const hayFiltrosActivos = hayFiltrosAplicados || !!(q || categoria || zonaId || precioMin || precioMax);
  const valorInvalido = (value: string) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0);
  const rangoInvalido = valorInvalido(precioMin) || valorInvalido(precioMax)
    || (precioMin !== '' && precioMax !== '' && Number(precioMin) > Number(precioMax));

  const categoriasTraducidas: Record<string, string> = {
    departamento: t('departamento'),
    'cabaña': t('cabana'),
    casa: t('casa'),
    'salón': t('salon'),
    cancha: t('cancha'),
    'local comercial': t('localComercial'),
    oficina: t('oficina'),
    lote: t('lote'),
  };
  const categoriaTraducida = (value: string) => categoriasTraducidas[value] || categoriaLabel(value);

  useEffect(() => {
    if (collapsedOnMobile) setMobileOpen(false);
  }, [collapsedOnMobile]);

  // Sincronizar estado cuando cambie la URL (ej: volver atrás, click externo, etc.)
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setCategoria(searchParams.get('categoria') || '');
    setZonaId(searchParams.get('zona_id') || '');
    setPrecioMin(searchParams.get('precio_min') || '');
    setPrecioMax(searchParams.get('precio_max') || '');
  }, [searchParams]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/zonas`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setZonas(data.flatMap((ciudad: { nombre: string; zonas?: { id: number; nombre: string }[] }) =>
            (ciudad.zonas || []).map((zona) => ({ id: zona.id, nombre: `${ciudad.nombre} · ${zona.nombre}` }))
          ));
        }
      })
      .catch(() => {});
  }, []);

  const aplicarFiltros = () => {
    if (rangoInvalido) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (categoria) params.set('categoria', categoria);
    if (zonaId) params.set('zona_id', zonaId);
    if (precioMin) params.set('precio_min', precioMin);
    if (precioMax) params.set('precio_max', precioMax);

    router.push(`${pathname}?${params.toString()}`);
  };

  const limpiarFiltros = () => {
    setQ('');
    setCategoria('');
    setZonaId('');
    setPrecioMin('');
    setPrecioMax('');
    router.push(pathname);
  };

  return (
    <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm space-y-5 lg:sticky lg:top-20">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          {collapsedOnMobile ? (
            <>
              <button type="button" aria-expanded={mobileOpen} aria-controls="catalog-filters"
                onClick={() => setMobileOpen((open) => !open)}
                className="lg:hidden min-h-11 flex items-center gap-2 text-sm font-bold text-foreground">
                {t('titulo')}
                {totalFiltrosAplicados > 0 && (
                  <span data-testid="catalog-active-filter-count" aria-hidden="true"
                    className="inline-flex min-w-5 justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground/80">
                    {totalFiltrosAplicados}
                  </span>
                )}
                <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
              </button>
              <h3 className="hidden lg:block font-bold text-sm text-foreground">{t('titulo')}</h3>
            </>
          ) : (
            <h3 className="font-bold text-sm text-foreground">{t('titulo')}</h3>
          )}
        </div>
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs text-muted-foreground hover:text-rose-400 min-h-[44px] min-w-[44px] px-2 py-1 inline-flex items-center gap-1 transition-colors rounded-lg"
          >
            <RotateCcw className="h-3 w-3" />
            {t('limpiar')}
          </button>
        )}
      </div>

      <div id="catalog-filters" className={`${collapsedOnMobile && !mobileOpen ? 'hidden lg:block' : 'block'} space-y-4`}>
        {/* Búsqueda por texto */}
        <div>
          <label htmlFor="catalog-keywords" className="text-xs font-semibold text-foreground/80 block mb-1.5">
            {t('palabrasClave')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              id="catalog-keywords"
              name="q"
              placeholder={t('ejemplo')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
              className="pl-8 text-xs h-11 min-h-[44px] bg-background"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{t('ayudaPalabras')}</p>
        </div>

        {/* Categoría */}
        <div>
          <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
            {t('tipo')}
          </label>
          <Select value={categoria} onValueChange={(val) => setCategoria(val || '')}>
            <SelectTrigger aria-label={t('tipo')} className="h-11 min-h-[44px] text-xs bg-background">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{categoria ? categoriaTraducida(categoria) : t('todasCategorias')}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((cat) => (
                <SelectItem key={cat.value || 'all'} value={cat.value} className="text-xs">
                  {cat.value ? categoriaTraducida(cat.value) : t('todas')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Zona */}
        <div>
          <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
            {t('ubicacion')}
          </label>
          <Select value={zonaId} onValueChange={(val) => setZonaId(val || '')}>
            <SelectTrigger aria-label={t('ubicacion')} className="h-11 min-h-[44px] text-xs bg-background">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="truncate">{zonas.find((zona) => String(zona.id) === zonaId)?.nombre || t('todasZonas')}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">{t('todasZonas')}</SelectItem>
              {zonas.map((z) => (
                <SelectItem key={z.id} value={String(z.id)} className="text-xs">
                  {z.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{t('ayudaZonas')}</p>
        </div>

        {/* Rango de Precios */}
        <div>
          <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
            {t('precio')} ({currency})
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={0}
              aria-label={t('minimo')}
              placeholder={t('minimo')}
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  precioMaxRef.current?.focus();
                }
              }}
              className="text-xs h-11 min-h-[44px] bg-background"
            />
            <Input
              type="number"
              min={0}
              aria-label={t('maximo')}
              ref={precioMaxRef}
              placeholder={t('maximo')}
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  aplicarFiltros();
                }
              }}
              className="text-xs h-11 min-h-[44px] bg-background"
            />
          </div>
          {locale !== 'es' && <p className="mt-1.5 text-[11px] text-muted-foreground">{t('notaConversion')}</p>}
          {rangoInvalido && <p role="alert" className="mt-1.5 text-xs text-destructive">{t('rangoInvalido')}</p>}
        </div>

        {/* Botón Aplicar */}
        <Button
          type="button"
          onClick={aplicarFiltros}
          disabled={rangoInvalido}
          className="w-full text-xs h-11 min-h-[44px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
        >
          {t('aplicar')}
        </Button>
      </div>

      {hayCambiosSinAplicar && !rangoInvalido && (
        <p role="status" className="text-xs text-muted-foreground">{t('pendientes')}</p>
      )}

      {/* Resumen exclusivo de filtros aplicados */}
      {hayFiltrosAplicados && (
        <div className="pt-2 border-t border-border/30">
          <span className="text-[11px] font-mono text-muted-foreground uppercase">{t('activos')}</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {applied.q && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20">
                &ldquo;{applied.q}&rdquo;
              </span>
            )}
            {applied.categoria && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20 capitalize">
                {categoriaTraducida(applied.categoria)}
              </span>
            )}
            {applied.zonaId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent/10 text-accent border border-accent/20">
                {zonas.find((z) => String(z.id) === applied.zonaId)?.nombre || t('zonaSeleccionada')}
              </span>
            )}
            {(applied.precioMin || applied.precioMax) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currency} {applied.precioMin || '0'} - {applied.precioMax || '∞'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
