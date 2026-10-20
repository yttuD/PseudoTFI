'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Building2, Wallet } from 'lucide-react';

import { CATEGORIAS_UNIDAD, categoriaLabel } from '@/lib/categorias';

export function SearchWizard() {
  const t = useTranslations('busqueda');
  const tComun = useTranslations('comun');
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const currency = locale === 'en' ? 'USD' : locale === 'pt' ? 'BRL' : 'ARS';
  
  const [categoria, setCategoria] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [q, setQ] = useState('');
  const [zonas, setZonas] = useState<{ id: string; nombre: string }[]>([]);

  // Sincronización inicial desde los URL Query Params (F5 o navegación directa)
  useEffect(() => {
    const pCat = searchParams.get('categoria');
    const pZona = searchParams.get('zona_id');
    const pPrecioMax = searchParams.get('precio_max');
    const pQ = searchParams.get('q');

    if (pCat) setCategoria(pCat);
    if (pZona) setZonaId(pZona);
    if (pPrecioMax) setPrecioMax(pPrecioMax);
    if (pQ) setQ(pQ);
  }, [searchParams]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/zonas`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setZonas(data.flatMap((ciudad: { nombre: string; zonas?: { id: string; nombre: string }[] }) =>
          (ciudad.zonas || []).map((zona) => ({ id: zona.id, nombre: `${ciudad.nombre} · ${zona.nombre}` }))
        ));
      })
      .catch(console.error);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (categoria) params.set('categoria', categoria);
    if (zonaId) params.set('zona_id', zonaId);
    if (precioMax) params.set('precio_max', precioMax);
    if (q) params.set('q', q);
    
    router.push(`/${locale}/unidades?${params.toString()}`);
  };

  return (
    <div data-testid="search-wizard" className="w-full flex flex-col md:flex-row items-center gap-3 bg-white/95 dark:bg-azul-800/90 border border-azul-900/10 dark:border-azul-700/60 shadow-xl shadow-azul-900/5 p-3 sm:p-4 rounded-2xl backdrop-blur-xl">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full min-w-0">
        {/* Búsqueda por texto libre */}
        <div className="w-full min-w-0 relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-azul-800 dark:text-dorado-300 pointer-events-none">
            <Search className="h-4 w-4" />
          </div>
          <Input 
            type="text" 
            placeholder="Buscar por título o descripción..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full h-12 pl-10 pr-3 bg-white/90 dark:bg-azul-900/60 text-sm font-medium text-azul-900 dark:text-crema placeholder:text-azul-900/50 dark:placeholder:text-neutro-400 rounded-xl border border-azul-900/15 dark:border-azul-700/60 focus:ring-1 focus:ring-azul-800 dark:focus:ring-dorado-500 truncate min-w-0"
          />
        </div>

        {/* Categoría */}
        <div className="w-full min-w-0">
          <Select onValueChange={(v) => setCategoria(v || '')} value={categoria}>
            <SelectTrigger className="w-full h-12 bg-white/90 dark:bg-azul-900/60 text-sm font-medium text-azul-900 dark:text-crema rounded-xl border border-azul-900/15 dark:border-azul-700/60 min-w-0 overflow-hidden px-3">
              <div className="flex items-center gap-2 truncate min-w-0 flex-1 overflow-hidden">
                <Building2 className="h-4 w-4 text-azul-800 dark:text-dorado-300 shrink-0" />
                <span className="truncate min-w-0 flex-1 text-left text-azul-900 dark:text-crema">
                  {categoria ? categoriaLabel(categoria) : (t('tipo') || 'Tipo de Unidad')}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-white dark:bg-azul-800 border border-azul-900/10 dark:border-azul-700/60">
              {CATEGORIAS_UNIDAD.map((c) => (
                <SelectItem key={c.value} value={c.value} className="cursor-pointer text-azul-900 dark:text-crema focus:bg-azul-50 dark:focus:bg-azul-700">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Zona */}
        <div className="w-full min-w-0">
          <Select onValueChange={(v) => setZonaId(v || '')} value={zonaId}>
            <SelectTrigger className="w-full h-12 bg-white/90 dark:bg-azul-900/60 text-sm font-medium text-azul-900 dark:text-crema rounded-xl border border-azul-900/15 dark:border-azul-700/60 min-w-0 overflow-hidden px-3">
              <div className="flex items-center gap-2 truncate min-w-0 flex-1 overflow-hidden">
                <MapPin className="h-4 w-4 text-azul-800 dark:text-dorado-300 shrink-0" />
                <span className="truncate min-w-0 flex-1 text-left text-azul-900 dark:text-crema">
                  {zonas.find((zona) => String(zona.id) === zonaId)?.nombre || (t('zona') || 'Seleccionar Zona')}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-white dark:bg-azul-800 border border-azul-900/10 dark:border-azul-700/60">
              {zonas.map((z) => (
                <SelectItem key={z.id} value={String(z.id)} className="cursor-pointer text-azul-900 dark:text-crema focus:bg-azul-50 dark:focus:bg-azul-700">
                  {z.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Precio Máximo */}
        <div className="w-full min-w-0 relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-azul-800 dark:text-dorado-300 pointer-events-none">
            <Wallet className="h-4 w-4" />
          </div>
          <Input 
            type="number" 
            placeholder={`${t('precio') || 'Precio máximo'} (${currency})`}
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full h-12 pl-10 pr-3 bg-white/90 dark:bg-azul-900/60 text-sm font-medium text-azul-900 dark:text-crema placeholder:text-azul-900/50 dark:placeholder:text-neutro-400 rounded-xl border border-azul-900/15 dark:border-azul-700/60 focus:ring-1 focus:ring-azul-800 dark:focus:ring-dorado-500 truncate min-w-0"
          />
        </div>
      </div>

      {/* Botón de Búsqueda */}
      <Button 
        type="button"
        onClick={handleSearch} 
        className="h-12 px-6 w-full md:w-auto rounded-xl bg-azul-900 hover:bg-azul-800 text-crema dark:bg-dorado-500 dark:text-azul-900 dark:hover:bg-dorado-600 font-semibold shadow-md transition-all shrink-0 flex items-center justify-center gap-2"
      >
        <Search className="h-4 w-4" />
        <span>{tComun('buscar') || 'Buscar'}</span>
      </Button>
    </div>
  );
}
