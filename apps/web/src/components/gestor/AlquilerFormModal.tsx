'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

const formSchema = z.object({
  unidad_id: z.string().min(1, 'Seleccione una unidad'),
  inquilino_id: z.string().min(1, 'Seleccione un inquilino'),
  fecha_inicio: z.date({
    message: 'La fecha de inicio es requerida',
  }),
  fecha_fin: z.date({
    message: 'La fecha de fin es requerida',
  }),
  monto_total: z.number().min(0, 'El monto debe ser positivo'),
  observaciones: z.string().optional(),
}).refine((data) => data.fecha_fin >= data.fecha_inicio, {
  message: "La fecha de fin no puede ser anterior a la de inicio",
  path: ["fecha_fin"],
});

type FormData = z.infer<typeof formSchema>;

export function AlquilerFormModal({
  token,
  unidades,
  inquilinos,
}: {
  token: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unidades: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inquilinos: any[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unidad_id: '',
      inquilino_id: '',
      observaciones: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alquileres`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          fecha_inicio: data.fecha_inicio.toISOString(),
          fecha_fin: data.fecha_fin.toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al crear el alquiler');
      }

      form.reset();
      setOpen(false);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Hubo un error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasInquilinos = inquilinos.length > 0;
  const hasUnidades = unidades.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Alquiler
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Alquiler</DialogTitle>
          <DialogDescription>
            Registrá un nuevo alquiler seleccionando la unidad y el inquilino.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label>Unidad</Label>
            <Controller
              control={form.control}
              name="unidad_id"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!hasUnidades}>
                  <SelectTrigger>
                    <SelectValue placeholder={hasUnidades ? "Seleccione una unidad" : "Cargá una unidad primero"} />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.titulo_es || `Unidad ${u.categoria}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.unidad_id && (
              <span className="text-sm text-red-500">
                {form.formState.errors.unidad_id.message}
              </span>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Inquilino</Label>
            <Controller
              control={form.control}
              name="inquilino_id"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!hasInquilinos}>
                  <SelectTrigger>
                    <SelectValue placeholder={hasInquilinos ? "Seleccione un inquilino" : "Cargá un inquilino primero"} />
                  </SelectTrigger>
                  <SelectContent>
                    {inquilinos.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.inquilino_id && (
              <span className="text-sm text-red-500">
                {form.formState.errors.inquilino_id.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Fecha Inicio</Label>
              <Controller
                control={form.control}
                name="fecha_inicio"
                render={({ field }) => (
                  <DatePicker date={field.value} setDate={field.onChange} />
                )}
              />
              {form.formState.errors.fecha_inicio && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.fecha_inicio.message}
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Fecha Fin</Label>
              <Controller
                control={form.control}
                name="fecha_fin"
                render={({ field }) => (
                  <DatePicker date={field.value} setDate={field.onChange} />
                )}
              />
              {form.formState.errors.fecha_fin && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.fecha_fin.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Monto Total</Label>
            <Input
              type="number"
              {...form.register('monto_total', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.monto_total && (
              <span className="text-sm text-red-500">
                {form.formState.errors.monto_total.message}
              </span>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasUnidades || !hasInquilinos}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
