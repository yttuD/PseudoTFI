'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  nombre: z.string().min(2, 'El nombre es obligatorio'),
});

type FormData = z.infer<typeof formSchema>;

export function GrupoFormModal({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      console.log('Sending fetch to /grupos');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/grupos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      console.log('Fetch /grupos resolved with status:', res.status);

      if (!res.ok) {
        const errText = await res.text();
        console.error('API Error /grupos:', res.status, errText);
        throw new Error(`Error al crear el grupo: ${errText}`);
      }

      form.reset();
      setOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Hubo un error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Grupo
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Grupo</DialogTitle>
          <DialogDescription>
            Creá un grupo para organizar tus unidades.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre del Grupo *</Label>
            <Input
              id="nombre"
              {...form.register('nombre')}
              placeholder="Ej. Edificio Libertador"
            />
            {form.formState.errors.nombre && (
              <span className="text-sm text-red-500">
                {form.formState.errors.nombre.message}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
