'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';


export default function DelegadoFormModal({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delegados/invitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al invitar delegado');
      }

      alert(`Se ha invitado a ${email} como delegado.`);

      setOpen(false);
      setEmail('');
      router.refresh();
    } catch (error: unknown) {
      const e = error as Error;
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button render={<button />} />}>
        + Invitar Delegado
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar Delegado</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email del delegado</label>
            <Input
              type="email"
              placeholder="empleado@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} render={<button />}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} render={<button />}>
              {loading ? 'Enviando...' : 'Invitar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
