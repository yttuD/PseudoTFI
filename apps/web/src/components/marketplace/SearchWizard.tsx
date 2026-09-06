'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const CATEGORIAS = ['Casa', 'Departamento', 'Oficina', 'Local Comercial', 'Lote'];

export function SearchWizard() {
  const t = useTranslations('busqueda');
  const tComun = useTranslations('comun');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [categoria, setCategoria] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [zonas, setZonas] = useState<{id: string, nombre: string}[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/zonas`)
      .then(res => res.json())
      .then(data => {
         if (data && data[0] && data[0].zonas) {
           setZonas(data[0].zonas);
         }
      })
      .catch(console.error);
  }, []);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleSearch();
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoria) params.set('categoria', categoria);
    if (zonaId) params.set('zona_id', zonaId);
    if (precioMax) params.set('precio_max', precioMax);
    
    // next-intl automatically handles locale prefixing when using next/navigation? 
    // Wait, with next-intl, we should use its custom useRouter to avoid hardcoding `/es/`. 
    // For now, let's keep it simple or use window.location.pathname's locale.
    const locale = window.location.pathname.split('/')[1] || 'es';
    router.push(`/${locale}/unidades?${params.toString()}`);
  };

  return (
    <div data-testid="search-wizard" className="bg-white rounded-xl shadow-lg p-6 max-w-xl w-full mx-auto border border-border">
      <h2 className="text-2xl font-bold mb-6 text-center">{t('titulo')}</h2>
      
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <label className="text-sm font-semibold">{t('tipo')}</label>
          <Select onValueChange={(v) => setCategoria(v || '')} value={categoria}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná una categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-in fade-in">
          <label className="text-sm font-semibold">{t('zona')}</label>
          <Select onValueChange={(v) => setZonaId(v || '')} value={zonaId}>
            <SelectTrigger>
              <SelectValue placeholder="Elegí la zona" />
            </SelectTrigger>
            <SelectContent>
              {zonas.map(z => (
                <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-in fade-in">
          <label className="text-sm font-semibold">{t('precio')}</label>
          <Input 
            type="number" 
            placeholder="Precio máximo" 
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
          />
        </div>
      )}

      <div className="mt-8 flex justify-between items-center gap-4">
        <Button variant="ghost" onClick={handleNext}>
          {t('omitir')}
        </Button>
        <Button onClick={handleNext} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {step === 3 ? tComun('buscar') || 'Buscar' : tComun('siguiente')}
        </Button>
      </div>
    </div>
  );
}
