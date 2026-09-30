'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MapPin, 
  Maximize2, 
  Camera as CameraIcon, 
  Search, 
  Sparkles, 
  Languages, 
  Sun, 
  Calendar, 
  Clock, 
  Trash2, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  UploadCloud,
  ImagePlus
} from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const LocationPickerMap = dynamic(
  () => import('./LocationPickerMap'),
  { ssr: false, loading: () => <div className="w-full h-full min-h-[400px] bg-muted animate-pulse rounded-xl" /> }
);

const modalidadSchema = z.object({
  id: z.string().optional(),
  unidad_tiempo: z.string().min(1),
  cantidad_tiempo: z.number().min(1),
  precio: z.number().min(0)
});

const formSchema = z.object({
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  zona_id: z.number().optional(),
  grupo_id: z.string().optional(),
  titulo_es: z.string().optional(),
  descripcion_es: z.string().optional(),
  titulo_en: z.string().optional(),
  descripcion_en: z.string().optional(),
  titulo_pt: z.string().optional(),
  descripcion_pt: z.string().optional(),
  auto_traducir: z.boolean().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  modalidades: z.array(modalidadSchema),
  fotos: z.array(z.string()).max(10).optional(),
  ubicacion_aprox: z.object({ lat: z.number(), lng: z.number() }).optional(),
  ubicacion_exacta: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

type FormData = z.infer<typeof formSchema>;

export function UnidadForm({ 
  initialData, 
  locale, 
  unidadId,
  zonas,
  token,
  grupos = []
}: { 
  initialData?: Record<string, unknown> & { modalidades?: Record<string, unknown>[] }, 
  locale: string, 
  unidadId?: string,
  zonas: Record<string, unknown>[],
  token: string,
  grupos?: { id: string; nombre: string }[]
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGrupoId = searchParams.get('grupo_id') || undefined;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('basicos');
  const [openMobileMap, setOpenMobileMap] = useState(false);

  // Estados de Idioma y Auto-traducción
  const [activeLangTab, setActiveLangTab] = useState<'es' | 'en' | 'pt'>('es');
  const [autoTraducir, setAutoTraducir] = useState<boolean>(true);

  // Estados de Geocodificación y Autocompletado Nominatim
  const [searchAddress, setSearchAddress] = useState('');
  const [suggestions, setSuggestions] = useState<{
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    address?: {
      road?: string;
      house_number?: string;
      suburb?: string;
      city?: string;
      town?: string;
      state?: string;
      postcode?: string;
      country?: string;
    };
  }[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addressResultName, setAddressResultName] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lista de grupos
  const [gruposList, setGruposList] = useState<{ id: string; nombre: string }[]>(grupos);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      categoria: 'departamento',
      grupo_id: preselectedGrupoId,
      auto_traducir: true,
      modalidades: [{ unidad_tiempo: 'día', cantidad_tiempo: 1, precio: 45000 }],
      fotos: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'modalidades'
  });

  const fotos = form.watch('fotos') || [];
  const ubicacionExacta = form.watch('ubicacion_exacta');

  // Supabase browser client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Cargar grupos si no vinieron por props
  useEffect(() => {
    if (gruposList.length === 0 && token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/grupos`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : (data.data || []);
          if (list.length > 0) setGruposList(list);
        })
        .catch(() => {});
    }
  }, [gruposList.length, token]);

  // ScrollSpy
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['basicos', 'marketplace', 'modalidades', 'fotos', 'ubicacion'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocompletado Reactivo con Nominatim (Debounce 500ms + sesgo Goya, Corrientes + countrycodes=ar)
  useEffect(() => {
    const cleanQuery = searchAddress.trim();
    if (!cleanQuery || cleanQuery.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearchingAddress(false);
      return;
    }

    // Si coincide con lo ya seleccionado, no re-buscar
    if (addressResultName && cleanQuery === addressResultName) {
      setShowDropdown(false);
      return;
    }

    setIsSearchingAddress(true);
    setAddressError(null);

    const timer = setTimeout(async () => {
      try {
        // Sesgo geográfico estricto: priorizar Goya, Corrientes en Argentina
        const searchQuery = cleanQuery.toLowerCase().includes('goya')
          ? cleanQuery
          : `${cleanQuery}, Goya, Corrientes`;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ar&limit=6&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'RendoApp/1.0 (contacto@rendo.com.ar)',
              'Accept-Language': 'es',
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setSuggestions(data || []);
          setShowDropdown(true);
          if (!data || data.length === 0) {
            setAddressError('No se encontraron sugerencias para esta dirección en Goya, Corrientes.');
          }
        } else {
          setAddressError('Servicio de geocodificación temporalmente no disponible.');
        }
      } catch (err) {
        console.error('Error en autocompletado Nominatim:', err);
        setAddressError('Error de red al consultar geocodificación.');
      } finally {
        setIsSearchingAddress(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchAddress, addressResultName]);

  const handleSelectSuggestion = (item: {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    address?: {
      road?: string;
      house_number?: string;
      suburb?: string;
      city?: string;
      town?: string;
      state?: string;
      postcode?: string;
      country?: string;
    };
  }) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    setSearchAddress(item.display_name);
    setAddressResultName(item.display_name);
    setShowDropdown(false);
    setSuggestions([]);
    setAddressError(null);

    // Actualizar coordenadas en el formulario y disparar recentrado fluido en el mapa
    form.setValue('ubicacion_exacta', { lat, lng });
    form.setValue('ubicacion_aprox', { lat, lng });
  };

  const handleLocationSelect = (loc: { lat: number, lng: number }) => {
    form.setValue('ubicacion_exacta', loc);
    form.setValue('ubicacion_aprox', loc);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsSubmitting(true);
    try {
      const file = e.target.files[0];
      const folder = unidadId || 'nuevas';
      const filePath = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { error: uploadError } = await supabase.storage
        .from('unidades')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('unidades')
        .getPublicUrl(filePath);

      const currentFotos = form.getValues('fotos') || [];
      const updatedFotos = [...currentFotos, publicUrl];
      form.setValue('fotos', updatedFotos);

      if (unidadId) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ fotos: updatedFotos })
        });
      }
    } catch (err) {
      console.error(err);
      alert('Error al subir la imagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNativeCameraUpload = async () => {
    if (!unidadId) {
      alert("Debe guardar la unidad primero");
      return;
    }

    setIsSubmitting(true);
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
      });

      if (!image.webPath) return;

      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const fileName = `${unidadId}/${Date.now()}-native-capture.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('unidades')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('unidades')
        .getPublicUrl(fileName);

      const currentFotos = form.getValues('fotos') || [];
      const updatedFotos = [...currentFotos, publicUrl];
      form.setValue('fotos', updatedFotos);

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fotos: updatedFotos })
      });
    } catch (err) {
      console.warn("Captura cancelada o error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFoto = async (index: number) => {
    const currentFotos = form.getValues('fotos') || [];
    const updatedFotos = currentFotos.filter((_, i) => i !== index);
    form.setValue('fotos', updatedFotos);

    if (unidadId) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ fotos: updatedFotos })
        });
      } catch (err) {
        console.error('Error al actualizar fotos tras eliminar:', err);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { modalidades, ...unidadData } = data;
      const url = unidadId 
        ? `${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/unidades`;
      
      const method = unidadId ? 'PATCH' : 'POST';

      const payload = {
        ...unidadData,
        auto_traducir: autoTraducir,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Error al guardar la unidad');
      }

      let id = unidadId;
      const savedUnidad = await res.json();
      id = savedUnidad.id;

      if (initialData?.modalidades && id) {
        const removed = initialData.modalidades.filter((m: Record<string, unknown>) => !modalidades.find((nm) => nm.id === m.id));
        for (const m of removed) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${id}/modalidades/${m.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
      }

      if (id) {
        for (const mod of modalidades) {
          if (mod.id) {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${id}/modalidades/${mod.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ unidad_tiempo: mod.unidad_tiempo, cantidad_tiempo: mod.cantidad_tiempo, precio: mod.precio })
            });
          } else {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${id}/modalidades`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ unidad_tiempo: mod.unidad_tiempo, cantidad_tiempo: mod.cantidad_tiempo, precio: mod.precio })
            });
          }
        }
      }

      if (!unidadId) {
        router.push(`/${locale}/mis-unidades/${id}/editar`);
      } else {
        router.push(`/${locale}/mis-unidades`);
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Hubo un error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-7xl mx-auto flex flex-col gap-8 relative">
      <div className="flex flex-col md:flex-row gap-8 items-start w-full">
        {/* Sticky ScrollSpy Sidebar */}
        <aside className="hidden md:block w-52 sticky top-24 shrink-0">
          <nav className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wider bg-card/50 p-2 rounded-2xl border border-border/60">
            <button type="button" onClick={() => scrollTo('basicos')} className={`text-left border-l-2 pl-4 py-2.5 rounded-r-lg transition-colors ${activeSection === 'basicos' ? 'border-primary text-primary bg-primary/5 font-bold' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>1. Básicos &amp; Grupo</button>
            <button type="button" onClick={() => scrollTo('marketplace')} className={`text-left border-l-2 pl-4 py-2.5 rounded-r-lg transition-colors ${activeSection === 'marketplace' ? 'border-primary text-primary bg-primary/5 font-bold' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>2. Ficha &amp; Idiomas</button>
            <button type="button" onClick={() => scrollTo('modalidades')} className={`text-left border-l-2 pl-4 py-2.5 rounded-r-lg transition-colors ${activeSection === 'modalidades' ? 'border-primary text-primary bg-primary/5 font-bold' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>3. Tarifas &amp; Precios</button>
            <button type="button" onClick={() => scrollTo('fotos')} className={`text-left border-l-2 pl-4 py-2.5 rounded-r-lg transition-colors ${activeSection === 'fotos' ? 'border-primary text-primary bg-primary/5 font-bold' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>4. Galería Fotos</button>
            <button type="button" onClick={() => scrollTo('ubicacion')} className={`text-left border-l-2 pl-4 py-2.5 rounded-r-lg transition-colors ${activeSection === 'ubicacion' ? 'border-primary text-primary bg-primary/5 font-bold' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>5. Ubicación &amp; GPS</button>
          </nav>
        </aside>

        {/* Main Content Flow */}
        <div className="flex-1 w-full min-w-0 space-y-10 pb-16">
        
        {/* SECCIÓN 1: DATOS BÁSICOS & GRUPO */}
        <section id="basicos" className="scroll-mt-24">
          <Card className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
                <Building2 className="w-5 h-5 text-dorado-600 dark:text-dorado-400" />
                📦 Datos Básicos &amp; Grupo
              </CardTitle>
              <CardDescription className="font-mono text-xs">Clasificación y pertenencia edilicia de la unidad</CardDescription>
            </CardHeader>
            <CardContent className="p-0 grid gap-6 md:grid-cols-3">
              {/* Categoría */}
              <div className="grid gap-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Categoría *</Label>
                <Select onValueChange={(val) => form.setValue('categoria', val as string)} defaultValue={form.getValues('categoria')}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Seleccione categoría..." /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="departamento">Departamento</SelectItem>
                    <SelectItem value="cabaña">Cabaña</SelectItem>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="salón">Salón de Eventos</SelectItem>
                    <SelectItem value="cancha">Cancha</SelectItem>
                    <SelectItem value="local comercial">Local Comercial</SelectItem>
                    <SelectItem value="oficina">Oficina</SelectItem>
                    <SelectItem value="lote">Lote / Terreno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grupo Organizativo */}
              <div className="grid gap-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Grupo / Edificio</Label>
                <Select 
                  onValueChange={(val) => form.setValue('grupo_id', val === 'none' || !val ? undefined : val)} 
                  defaultValue={form.getValues('grupo_id') || preselectedGrupoId || 'none'}
                >
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Sin grupo asignado" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">Sin grupo asignado (Individual)</SelectItem>
                    {gruposList.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zona Operativa */}
              <div className="grid gap-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Zona Operativa</Label>
                <Select onValueChange={(val) => form.setValue('zona_id', Number(val))} defaultValue={form.getValues('zona_id')?.toString()}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(Array.isArray(zonas) ? zonas : []).map((z: any) => <SelectItem key={z.id} value={z.id.toString()}>{z.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        <hr className="border-border" />

        {/* SECCIÓN 2: FICHA DE MARKETPLACE & AUTO-TRADUCCIÓN */}
        <section id="marketplace" className="scroll-mt-24">
          <Card className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
            <CardHeader className="p-0 space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
                    <Languages className="w-5 h-5 text-dorado-600 dark:text-dorado-400" />
                    🌐 Ficha de Marketplace
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">Información pública visible para inquilinos y turistas</CardDescription>
                </div>

                {/* Toggle Switch de Auto-traducción */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-primary/20 bg-primary/5 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">Traducción automática</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Disponible en inglés y portugués</span>
                  </div>
                  <Switch 
                    checked={autoTraducir} 
                    onCheckedChange={(checked) => {
                      setAutoTraducir(checked);
                      form.setValue('auto_traducir', checked);
                    }} 
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-0 space-y-6">
              {/* Selector de Pestañas de Idioma */}
              <div className="inline-flex rounded-xl p-1 bg-muted/70 border border-border/60">
                <button
                  type="button"
                  onClick={() => setActiveLangTab('es')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeLangTab === 'es'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>🇪🇸 Español</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">Principal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab('en')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeLangTab === 'en'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>🇬🇧 English</span>
                  {autoTraducir && <span className="text-[10px] font-mono opacity-70">Auto</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab('pt')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeLangTab === 'pt'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>🇧🇷 Português</span>
                  {autoTraducir && <span className="text-[10px] font-mono opacity-70">Auto</span>}
                </button>
              </div>

              {/* PESTAÑA 1: ESPAÑOL */}
              {activeLangTab === 'es' && (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="font-mono text-xs uppercase text-muted-foreground">Título de la Publicación (Español) *</Label>
                    <Input 
                      {...form.register('titulo_es')} 
                      placeholder="Ej. Cabaña Premium frente al río con pileta y quincho" 
                      className="h-12 text-base font-medium rounded-xl" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-mono text-xs uppercase text-muted-foreground">Descripción Completa (Español) *</Label>
                    <Textarea 
                      {...form.register('descripcion_es')} 
                      placeholder="Describe los ambientes, equipamiento, vistas, cercanías y servicios incluidos..." 
                      rows={5} 
                      className="resize-none rounded-xl text-sm" 
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: INGLÉS */}
              {activeLangTab === 'en' && (
                <div className="space-y-4">
                  {autoTraducir && (
                    <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-primary flex items-start sm:items-center gap-2.5">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                      <span className="leading-relaxed">
                        <strong>Automatic translation enabled:</strong> Your title and description will be automatically translated into English and Portuguese for foreign tenants and tourists. You can disable this option if you prefer to write your own texts.
                      </span>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label className="font-mono text-xs uppercase text-muted-foreground">Título en Inglés (Listing Title)</Label>
                    <Input 
                      {...form.register('titulo_en')} 
                      placeholder="e.g. Premium Riverfront Cabin with Private Pool" 
                      className="h-12 text-base font-medium rounded-xl" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-mono text-xs uppercase text-muted-foreground">Descripción en Inglés (Full Description)</Label>
                    <Textarea 
                      {...form.register('descripcion_en')} 
                      placeholder="Property details, amenities and nearby highlights..." 
                      rows={5} 
                      className="resize-none rounded-xl text-sm" 
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: PORTUGUÉS */}
              {activeLangTab === 'pt' && (
                <div className="space-y-4">
                  {autoTraducir && (
                    <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-primary flex items-start sm:items-center gap-2.5">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                      <span className="leading-relaxed">
                        <strong>Tradução automática ativada:</strong> Seu título e descrição serão traduzidos automaticamente para o inglês e português para inquilinos e turistas estrangeiros. Você pode desativar esta opção se preferir escrever seus próprios textos.
                      </span>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label className="font-mono text-xs uppercase text-muted-foreground">Título em Português</Label>
                    <Input 
                      {...form.register('titulo_pt')} 
                      placeholder="ex. Chalé Premium à beira do rio com piscina" 
                      className="h-12 text-base font-medium rounded-xl" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-mono text-xs uppercase text-muted-foreground">Descrição em Português</Label>
                    <Textarea 
                      {...form.register('descripcion_pt')} 
                      placeholder="Detalhes do imóvel, comodidades e localização..." 
                      rows={5} 
                      className="resize-none rounded-xl text-sm" 
                    />
                  </div>
                </div>
              )}

              {/* Redes de Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="grid gap-2">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">WhatsApp de Contacto Directo</Label>
                  <Input {...form.register('whatsapp')} placeholder="+54 9 3777 123456" className="h-12 font-mono rounded-xl" />
                  <p className="text-[11px] text-muted-foreground font-mono">Visible solo para inquilinos autenticados en el marketplace.</p>
                </div>
                <div className="grid gap-2">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">Instagram (Opcional)</Label>
                  <Input {...form.register('instagram')} placeholder="@mi_propiedad" className="h-12 font-mono rounded-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <hr className="border-border" />

        {/* SECCIÓN 3: ESQUEMA DE TARIFAS (LENGUAJE NATURAL) */}
        <section id="modalidades" className="scroll-mt-24">
          <Card className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
                <Sun className="w-5 h-5 text-dorado-600 dark:text-dorado-400" />
                💰 Esquema de Tarifas (Lenguaje Natural)
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Configura cómo deseas cobrar y los plazos mínimos de estadía o contrato
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
              {/* Selector Rápido de Nuevas Tarifas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => append({ unidad_tiempo: 'día', cantidad_tiempo: 1, precio: 45000 })}
                  className="min-h-[90px] p-4 flex items-center gap-3.5 rounded-2xl border border-border/80 bg-surface/80 hover:border-dorado-500/60 hover:bg-dorado-500/5 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm font-semibold text-foreground block whitespace-nowrap">Alquiler por Día</strong>
                    <span className="text-xs text-muted-foreground block mt-0.5">Por noche o temporada</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => append({ unidad_tiempo: 'mes', cantidad_tiempo: 1, precio: 250000 })}
                  className="min-h-[90px] p-4 flex items-center gap-3.5 rounded-2xl border border-border/80 bg-surface/80 hover:border-dorado-500/60 hover:bg-dorado-500/5 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm font-semibold text-foreground block whitespace-nowrap">Alquiler Mensual</strong>
                    <span className="text-xs text-muted-foreground block mt-0.5">Contratos tradicionales</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => append({ unidad_tiempo: 'hora', cantidad_tiempo: 1, precio: 15000 })}
                  className="min-h-[90px] p-4 flex items-center gap-3.5 rounded-2xl border border-border/80 bg-surface/80 hover:border-dorado-500/60 hover:bg-dorado-500/5 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm font-semibold text-foreground block whitespace-nowrap">Alquiler por Hora</strong>
                    <span className="text-xs text-muted-foreground block mt-0.5">Canchas, eventos y turnos</span>
                  </div>
                </button>
              </div>

              {/* Lista de Modalidades Configuradas */}
              {fields.length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-2xl bg-muted/20">
                  <p className="text-muted-foreground font-mono text-sm">
                    No has agregado ninguna tarifa. Selecciona una opción arriba para comenzar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const tiempo = form.watch(`modalidades.${index}.unidad_tiempo`);
                    const isDia = tiempo === 'día' || tiempo === 'dia';
                    const isMes = tiempo === 'mes';

                    return (
                      <div
                        key={field.id}
                        className="p-5 rounded-2xl border border-border/80 bg-card/85 backdrop-blur-sm shadow-sm space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl ${
                              isDia ? 'bg-amber-500/10 text-amber-600' : isMes ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'
                            }`}>
                              {isDia ? <Sun className="w-4 h-4" /> : isMes ? <Calendar className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <strong className="text-sm font-semibold">
                              {isDia ? 'Modalidad: Alquiler Diario / Por Noche' : isMes ? 'Modalidad: Alquiler Mensual (Contrato)' : 'Modalidad: Alquiler Por Hora (Turnos)'}
                            </strong>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-mono min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Precio */}
                          <div className="grid gap-2">
                            <Label className="font-mono text-xs uppercase text-muted-foreground">
                              {isDia ? 'Precio por Día / Noche ($ ARS) *' : isMes ? 'Monto Mensual ($ ARS) *' : 'Precio por Hora ($ ARS) *'}
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">$</span>
                              <Input
                                id={`precio_${index}`}
                                type="number"
                                placeholder="Precio ($ ARS)"
                                data-testid="input-precio"
                                className="h-12 pl-8 font-mono text-base rounded-xl font-semibold"
                                {...form.register(`modalidades.${index}.precio`, { valueAsNumber: true })}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground">Tarifa final visible en la ficha de la unidad.</span>
                          </div>

                          {/* Estadía o Plazo Mínimo */}
                          <div className="grid gap-2">
                            <Label className="font-mono text-xs uppercase text-muted-foreground">
                              {isDia ? 'Estadía Mínima Requerida (Días) *' : isMes ? 'Plazo Mínimo de Alquiler (Meses) *' : 'Reserva Mínima (Horas) *'}
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              className="h-12 font-mono text-base rounded-xl font-semibold text-center"
                              {...form.register(`modalidades.${index}.cantidad_tiempo`, { valueAsNumber: true })}
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {isDia ? 'Mínimo de noches que el huésped debe reservar.' : isMes ? 'Meses mínimos de vigencia del contrato.' : 'Cantidad mínima de horas por turno.'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* SECCIÓN 4: GALERÍA DE FOTOS */}
        <hr className="border-border" />
        <section id="fotos" className="scroll-mt-24 space-y-6">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
              <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
                <ImagePlus className="w-5 h-5 text-dorado-600 dark:text-dorado-400" />
                📸 Galería de Fotos
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                ({fotos.length}/10) imágenes publicadas de alta calidad para el marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              {fotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {fotos.map((foto, index) => (
                    <div key={index} className="relative group rounded-xl border aspect-square bg-muted overflow-hidden shadow-sm hover:shadow-md transition-all">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={foto} alt={`Foto ${index + 1}`} className="object-cover w-full h-full" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 rounded-full"
                        onClick={() => handleRemoveFoto(index)}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {fotos.length < 10 && (
                <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-2xl p-6 bg-muted/10 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Arrastrá hasta 10 imágenes o hacé clic para seleccionar
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      PNG, JPG, WEBP (hasta 5MB por archivo)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleNativeCameraUpload}
                      disabled={isSubmitting}
                      className="flex items-center justify-center gap-2 font-mono text-xs uppercase rounded-xl min-h-[44px] min-w-[44px]"
                    >
                      <CameraIcon className="w-4 h-4 text-primary" />
                      Cámara / Galería Móvil
                    </Button>
                    <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-xs min-h-[44px] min-w-[44px]">
                      <span>Seleccionar Archivos</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isSubmitting}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {isSubmitting && (
                    <span className="text-xs text-muted-foreground font-mono animate-pulse">
                      Subiendo archivo a almacenamiento seguro...
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <hr className="border-border" />

        {/* SECCIÓN 4: GEOLOCALIZACIÓN & UBICACIÓN */}
        <section id="ubicacion" className="scroll-mt-24">
          <Card className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
                <MapPin className="w-5 h-5 text-dorado-600 dark:text-dorado-400" />
                📍 Geolocalización &amp; Ubicación
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Busca la dirección exacta por texto o coloca el pin manualmente sobre el mapa Leaflet con geocodificación inversa bidireccional
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
              {/* Buscador de Direcciones con Autocompletado Nominatim */}
              <div ref={dropdownRef} className="p-4 rounded-2xl border border-primary/20 bg-card/85 backdrop-blur-md shadow-sm space-y-2 relative z-30">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Dirección, Ciudad o Localidad (Autocompletado con Nominatim)
                  </Label>
                  {isSearchingAddress && (
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-primary animate-pulse">
                      <Spinner size="sm" />
                      Buscando en Goya, Ctes...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      value={searchAddress}
                      onChange={(e) => {
                        setSearchAddress(e.target.value);
                        if (addressResultName && e.target.value !== addressResultName) {
                          setAddressResultName(null);
                        }
                      }}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowDropdown(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowDropdown(false);
                        if (e.key === 'Enter' && suggestions.length > 0 && showDropdown) {
                          e.preventDefault();
                          handleSelectSuggestion(suggestions[0]);
                        }
                      }}
                      placeholder="Ej: Belgrano 750, Goya, Corrientes"
                      className="h-12 pl-10 pr-10 rounded-xl text-sm bg-background/80"
                    />
                    {isSearchingAddress ? (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <Spinner size="sm" />
                      </div>
                    ) : addressResultName ? (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : null}
                  </div>

                  {/* Dropdown flotante de sugerencias Nominatim */}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-border/40 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-100">
                      {suggestions.map((item) => {
                        const road = item.address?.road || item.name || '';
                        const houseNumber = item.address?.house_number ? ` ${item.address.house_number}` : '';
                        const mainTitle = road ? `${road}${houseNumber}` : item.display_name.split(',')[0];
                        const subtitle = item.display_name;

                        return (
                          <button
                            key={item.place_id}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="w-full text-left p-3 hover:bg-dorado-50 dark:hover:bg-azul-700 transition-colors flex items-start gap-2.5 group focus:outline-none cursor-pointer"
                          >
                            <MapPin className="w-4 h-4 text-dorado-600 dark:text-dorado-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-foreground block truncate">
                                {mainTitle}
                              </span>
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {subtitle}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Feedback de resultado o error */}
                {addressResultName && (
                  <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate"><strong>Ubicación fijada:</strong> {addressResultName}</span>
                  </div>
                )}
                {addressError && (
                  <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{addressError}</span>
                  </div>
                )}
              </div>

              {/* Desktop inline map (con canvas libre y sin overlays tapando los controles) */}
              <div className="hidden md:block border border-border rounded-2xl overflow-hidden h-[420px] shadow-sm relative z-0">
                <LocationPickerMap 
                  initialLocation={ubicacionExacta || null} 
                  onLocationSelect={handleLocationSelect} 
                  onAddressChange={(detectedAddress) => {
                    setSearchAddress(detectedAddress);
                    setAddressResultName(detectedAddress);
                    setAddressError(null);
                  }}
                />
              </div>

              {/* Mobile fullscreen dialog trigger */}
              <div className="block md:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenMobileMap(true)}
                  className="w-full h-14 rounded-2xl border-dashed flex items-center justify-between px-4 font-mono text-xs uppercase"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {ubicacionExacta ? 'Editar ubicación en mapa' : 'Fijar ubicación en mapa'}
                  </span>
                  <Maximize2 className="w-4 h-4 text-muted-foreground" />
                </Button>

                <Dialog open={openMobileMap} onOpenChange={setOpenMobileMap}>
                  <DialogContent className="p-0 max-w-none w-screen h-[100dvh] max-h-[100dvh] rounded-none flex flex-col border-none bg-background">
                    <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0 shrink-0">
                      <DialogTitle className="text-base font-bold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" /> Fijar Ubicación
                      </DialogTitle>
                    </DialogHeader>
                    <div className="relative flex-1 w-full h-full overflow-hidden">
                      <LocationPickerMap
                        initialLocation={ubicacionExacta || null}
                        onLocationSelect={handleLocationSelect}
                        onAddressChange={(detectedAddress) => {
                          setSearchAddress(detectedAddress);
                          setAddressResultName(detectedAddress);
                          setAddressError(null);
                        }}
                      />
                      <div className="absolute bottom-6 left-4 right-4 z-[1000] pb-safe">
                        <Button
                          type="button"
                          className="w-full h-12 rounded-xl shadow-xl font-mono uppercase text-xs tracking-wider bg-dorado-500 hover:bg-dorado-600 text-azul-900 font-bold"
                          onClick={() => setOpenMobileMap(false)}
                        >
                          Confirmar Ubicación
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Mobile compact location summary outside modal */}
              <div className="block md:hidden">
                {(ubicacionExacta || addressResultName || searchAddress) ? (
                  <div data-testid="mobile-location-preview" className="mt-2 p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{addressResultName || searchAddress || 'Ubicación fijada en mapa'}</span>
                    </div>
                    {ubicacionExacta && (
                      <div className="text-[11px] text-muted-foreground font-mono">
                        GPS: {ubicacionExacta.lat.toFixed(5)}, {ubicacionExacta.lng.toFixed(5)}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[11px] text-muted-foreground italic">
                    Sin ubicación fijada aún. Podés buscar por dirección o abrir el mapa.
                  </p>
                )}
              </div>

              {ubicacionExacta && (
                <div className="hidden md:flex text-xs text-muted-foreground font-mono items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>COORDENADAS GPS: {ubicacionExacta.lat.toFixed(5)}, {ubicacionExacta.lng.toFixed(5)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        </div>
      </div>

      {/* Barra de Acciones Fija (Sticky Footer Despejado) */}
      <div className="sticky bottom-0 z-40 w-full bg-card/95 backdrop-blur-md border border-border p-4 shadow-2xl flex items-center justify-between gap-4 rounded-2xl">
        <span className="text-sm font-mono text-muted-foreground hidden sm:inline-block">
          {isSubmitting ? 'Guardando en BD...' : 'Formulario listo para sincronizar'}
        </span>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => router.back()} 
            className="font-mono uppercase text-xs tracking-wider rounded-xl hover:bg-muted min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="bg-dorado-500 hover:bg-dorado-600 text-azul-900 font-bold px-6 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2 min-h-[44px] min-w-[44px]"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2 text-azul-900" />
                Guardando...
              </>
            ) : (
              'Guardar Unidad'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
