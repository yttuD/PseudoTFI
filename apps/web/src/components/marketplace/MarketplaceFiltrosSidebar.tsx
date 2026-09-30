'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Filter, Building2, MapPin, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIAS = [
  { label: 'Todas', value: '' },
  { label: 'Casa', value: 'casa' },
  { label: 'Departamento', value: 'departamento' },
  { label: 'Oficina', value: 'oficina' },
  { label: 'Local Comercial', value: 'local comercial' },
  { label: 'Lote', value: 'lote' },
];

export function MarketplaceFiltrosSidebar({ collapsedOnMobile = false }: { collapsedOnMobile?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [categoria, setCategoria] = useState(searchParams.get('categoria') || '');
  const [zonaId, setZonaId] = useState(searchParams.get('zona_id') || '');
  const [precioMin, setPrecioMin] = useState(searchParams.get('precio_min') || '');
  const [precioMax, setPrecioMax] = useState(searchParams.get('precio_max') || '');
  const [zonas, setZonas] = useState<{ id: string | number; nombre: string }[]>([]);
  const [mobileOpen, setMobileOpen] = useState(!collapsedOnMobile);

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
        if (data && data[0] && data[0].zonas) {
          setZonas(data[0].zonas);
        }
      })
      .catch(() => {});
  }, []);

  const aplicarFiltros = () => {
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

  const hayFiltrosActivos = !!(q || categoria || zonaId || precioMin || precioMax);

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
                Filtros del Catálogo <ChevronDown className={`h-4 w-4 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
              </button>
              <h3 className="hidden lg:block font-bold text-sm text-foreground">Filtros del Catálogo</h3>
            </>
          ) : (
            <h3 className="font-bold text-sm text-foreground">Filtros del Catálogo</h3>
          )}
        </div>
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs text-muted-foreground hover:text-rose-400 min-h-[44px] min-w-[44px] px-2 py-1 inline-flex items-center gap-1 transition-colors rounded-lg"
          >
            <RotateCcw className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      <div id="catalog-filters" className={`${collapsedOnMobile && !mobileOpen ? 'hidden lg:block' : 'block'} space-y-4`}>
        {/* Búsqueda por texto */}
        <div>
          <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
            Palabras clave
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              name="q"
              placeholder="Buscar por zona, título..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
              className="pl-8 text-xs h-11 min-h-[44px] bg-background"
            />
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
            Tipo de Unidad
          </label>
          <Select value={categoria} onValueChange={(val) => setCategoria(val || '')}>
            <SelectTrigger className="h-11 min-h-[44px] text-xs bg-background">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Todas las categorías" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((cat) => (
                <SelectItem key={cat.value || 'all'} value={cat.value} className="text-xs">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Zona */}
        <div>
          <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
            Ubicación / Zona
          </label>
          <Select value={zonaId} onValueChange={(val) => setZonaId(val || '')}>
            <SelectTrigger className="h-11 min-h-[44px] text-xs bg-background">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                <SelectValue placeholder="Todas las zonas" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">Todas las zonas</SelectItem>
              {zonas.map((z) => (
                <SelectItem key={z.id} value={String(z.id)} className="text-xs">
                  {z.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rango de Precios */}
        <div>
          <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
            Rango de Precio ($ ARS)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Mínimo"
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
              className="text-xs h-11 min-h-[44px] bg-background"
            />
            <Input
              type="number"
              placeholder="Máximo"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
              className="text-xs h-11 min-h-[44px] bg-background"
            />
          </div>
        </div>

        {/* Botón Aplicar */}
        <Button
          type="button"
          onClick={aplicarFiltros}
          className="w-full text-xs h-11 min-h-[44px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
        >
          Aplicar Filtros
        </Button>
      </div>

      {/* Resumen de filtros aplicados */}
      {hayFiltrosActivos && (
        <div className="pt-2 border-t border-border/30">
          <span className="text-[11px] font-mono text-muted-foreground uppercase">Filtros Activos:</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {q && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20">
                &ldquo;{q}&rdquo;
              </span>
            )}
            {categoria && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20 capitalize">
                {categoria}
              </span>
            )}
            {zonaId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent/10 text-accent border border-accent/20">
                Zona #{zonaId}
              </span>
            )}
            {(precioMin || precioMax) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ${precioMin || '0'} - ${precioMax || '∞'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
