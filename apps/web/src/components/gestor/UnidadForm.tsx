'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@supabase/ssr';

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
  grupos,
  token
}: { 
  initialData?: Record<string, unknown> & { modalidades?: Record<string, unknown>[] }, 
  locale: string, 
  unidadId?: string,
  zonas: Record<string, unknown>[],
  grupos: Record<string, unknown>[],
  token: string
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      categoria: '',
      modalidades: [],
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!unidadId) {
      alert("Debe guardar la unidad primero");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const file = e.target.files[0];
      const filePath = `${unidadId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('unidades')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('unidades')
        .getPublicUrl(filePath);

      const newFotos = [...fotos, publicUrl];
      form.setValue('fotos', newFotos);
      
      // Update BD inmediatamente para no perder la foto
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fotos: newFotos })
      });
      
    } catch (err: unknown) {
      console.error(err);
      alert('Error al subir foto: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveFoto = async (index: number) => {
    const newFotos = fotos.filter((_, i) => i !== index);
    form.setValue('fotos', newFotos);
    if (unidadId) {
       await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fotos: newFotos })
      });
    }
  };

  const handleLocationSelect = (loc: { lat: number, lng: number }) => {
    form.setValue('ubicacion_exacta', loc);
    const aproxLat = parseFloat(loc.lat.toFixed(3));
    const aproxLng = parseFloat(loc.lng.toFixed(3));
    form.setValue('ubicacion_aprox', { lat: aproxLat, lng: aproxLng });
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      let id = unidadId;
      const { modalidades, ...unidadData } = data;

      // 1. POST or PATCH Unidad
      const url = id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/unidades/${id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/unidades`;
        
      const res = await fetch(url, {
        method: id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(unidadData)
      });

      if (!res.ok) throw new Error('Error al guardar la unidad');
      const savedUnidad = await res.json();
      id = savedUnidad.id;

      // 2. Sync Modalidades
      if (initialData?.modalidades && id) {
        // Find removed modalities
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
            // PATCH
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${id}/modalidades/${mod.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                unidad_tiempo: mod.unidad_tiempo,
                cantidad_tiempo: mod.cantidad_tiempo,
                precio: mod.precio
              })
            });
          } else {
            // POST
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${id}/modalidades`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                unidad_tiempo: mod.unidad_tiempo,
                cantidad_tiempo: mod.cantidad_tiempo,
                precio: mod.precio
              })
            });
          }
        }
      }

      if (!unidadId) { // Es creación
        alert('Unidad creada. Ya podés agregar fotos y ubicación.');
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

  const getLabel = (unidad: string, cantidad: number) => {
    if (unidad === 'día' && cantidad === 1) return 'Diario';
    if (unidad === 'día' && cantidad === 7) return 'Semanal';
    if (unidad === 'día' && cantidad === 14) return 'Quincenal';
    if (unidad === 'día' && cantidad === 30) return 'Mensual';
    return `${cantidad} ${unidad}s`;
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <Tabs defaultValue="basicos" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="basicos">Datos básicos</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="modalidades">Modalidades</TabsTrigger>
          {unidadId && (
            <>
              <TabsTrigger value="fotos">Fotos</TabsTrigger>
              <TabsTrigger value="ubicacion">Ubicación</TabsTrigger>
            </>
          )}
        </TabsList>
        
        <TabsContent value="basicos" className="space-y-4">
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select onValueChange={(val) => form.setValue('categoria', val as string)} defaultValue={form.getValues('categoria')}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="departamento">Departamento</SelectItem>
                <SelectItem value="cabaña">Cabaña</SelectItem>
                <SelectItem value="salón">Salón</SelectItem>
                <SelectItem value="cancha">Cancha</SelectItem>
                <SelectItem value="casa">Casa</SelectItem>
                <SelectItem value="local comercial">Local Comercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label>Zona</Label>
            <Select onValueChange={(val) => form.setValue('zona_id', Number(val))} defaultValue={form.getValues('zona_id')?.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una zona (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {zonas.map((z: any) => (
                  <SelectItem key={z.id} value={z.id.toString()}>{z.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label>Grupo</Label>
            <Select onValueChange={(val) => form.setValue('grupo_id', val as string)} defaultValue={form.getValues('grupo_id')}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un grupo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {grupos.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
        
        <TabsContent value="marketplace" className="space-y-4">
          <div className="grid gap-2">
            <Label>Título (obligatorio para publicar)</Label>
            <Input {...form.register('titulo_es')} placeholder="Ej. Hermosa cabaña con pileta" />
          </div>
          <div className="grid gap-2">
            <Label>Descripción</Label>
            <Textarea {...form.register('descripcion_es')} placeholder="Detalles de la propiedad..." rows={4} />
          </div>
          <div className="grid gap-2">
            <Label>WhatsApp</Label>
            <Input {...form.register('whatsapp')} placeholder="3777123456" />
          </div>
          <div className="grid gap-2">
            <Label>Instagram</Label>
            <Input {...form.register('instagram')} placeholder="usuario" />
          </div>
        </TabsContent>
        
        <TabsContent value="modalidades" className="space-y-4">
          {fields.map((field, index) => {
            const unidad = form.watch(`modalidades.${index}.unidad_tiempo`);
            const cantidad = form.watch(`modalidades.${index}.cantidad_tiempo`);
            const label = getLabel(unidad, cantidad);
            
            return (
              <div key={field.id} className="flex items-end gap-2 border p-4 rounded-md relative">
                <div className="grid gap-2 flex-1">
                  <Label>Unidad Tiempo</Label>
                  <Select onValueChange={(val) => form.setValue(`modalidades.${index}.unidad_tiempo`, val as string)} defaultValue={form.getValues(`modalidades.${index}.unidad_tiempo`)}>
                    <SelectTrigger><SelectValue placeholder="Ej. día, hora" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="día">Día</SelectItem>
                      <SelectItem value="hora">Hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 w-24">
                  <Label>Cantidad</Label>
                  <Input type="number" {...form.register(`modalidades.${index}.cantidad_tiempo`, { valueAsNumber: true })} />
                </div>
                <div className="grid gap-2 w-32">
                  <Label>Precio ($)</Label>
                  <Input type="number" {...form.register(`modalidades.${index}.precio`, { valueAsNumber: true })} />
                </div>
                <div className="flex items-center h-10 px-4 bg-primary/10 text-primary font-medium rounded-md">
                  {label}
                </div>
                <Button type="button" variant="destructive" onClick={() => remove(index)}>Quitar</Button>
              </div>
            );
          })}
          
          <Button type="button" variant="outline" onClick={() => append({ unidad_tiempo: 'día', cantidad_tiempo: 1, precio: 0 })}>
            + Agregar Modalidad
          </Button>
        </TabsContent>

        {unidadId && (
          <TabsContent value="fotos" className="space-y-4">
            <div className="grid gap-2">
              <Label>Fotos de la Unidad ({fotos.length}/10)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative group rounded-md border aspect-video bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto} alt={`Foto ${index + 1}`} className="object-cover w-full h-full" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 rounded-full"
                      onClick={() => handleRemoveFoto(index)}
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
              
              {fotos.length < 10 && (
                <div className="mt-4 flex items-center gap-4">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                    disabled={isSubmitting}
                    className="max-w-sm"
                  />
                  {isSubmitting && <span className="text-sm text-muted-foreground animate-pulse">Subiendo...</span>}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {unidadId && (
          <TabsContent value="ubicacion" className="space-y-4">
            <div className="grid gap-2">
              <Label>Ubicación en el Mapa</Label>
              <p className="text-sm text-muted-foreground">
                Hacé click en el mapa para marcar la ubicación exacta de tu unidad. Los huéspedes verán una zona aproximada hasta que confirmen la reserva.
              </p>
              <div className="border rounded-xl overflow-hidden mt-2 h-[400px]">
                <LocationPickerMap 
                  initialLocation={ubicacionExacta || null} 
                  onLocationSelect={handleLocationSelect} 
                />
              </div>
              {ubicacionExacta && (
                <div className="text-xs text-muted-foreground mt-2">
                  Coordenadas exactas guardadas: {ubicacionExacta.lat}, {ubicacionExacta.lng}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
      
      <div className="flex justify-end gap-4 border-t pt-4">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Unidad'}
        </Button>
      </div>
    </form>
  );
}
