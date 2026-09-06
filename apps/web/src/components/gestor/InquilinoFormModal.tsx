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
  nombre_completo: z.string().min(2, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  documento_identidad: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

export function InquilinoFormModal({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_completo: '',
      email: '',
      telefono: '',
      documento_identidad: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        nombre_completo: data.nombre_completo,
        ...(data.email ? { email: data.email } : {}),
        ...(data.telefono ? { telefono: data.telefono } : {}),
        ...(data.documento_identidad ? { documento: data.documento_identidad } : {}),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inquilinos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('API Error /inquilinos:', res.status, errText);
        throw new Error(`Error al crear el inquilino: ${errText}`);
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
            <Plus className="mr-2 h-4 w-4" /> Nuevo Inquilino
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Inquilino</DialogTitle>
          <DialogDescription>
            Creá un inquilino para asociarlo a tus alquileres.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="nombre_completo">Nombre Completo *</Label>
            <Input
              id="nombre_completo"
              {...form.register('nombre_completo')}
              placeholder="Ej. Juan Pérez"
            />
            {form.formState.errors.nombre_completo && (
              <span className="text-sm text-red-500">
                {form.formState.errors.nombre_completo.message}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              placeholder="juan@ejemplo.com"
            />
            {form.formState.errors.email && (
              <span className="text-sm text-red-500">
                {form.formState.errors.email.message}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              {...form.register('telefono')}
              placeholder="Ej. 3777123456"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="documento_identidad">Documento de Identidad</Label>
            <Input
              id="documento_identidad"
              {...form.register('documento_identidad')}
              placeholder="DNI o Pasaporte"
            />
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
