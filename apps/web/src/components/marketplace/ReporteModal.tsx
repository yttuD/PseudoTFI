'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ReporteModalProps {
  unidadId: string;
  isLoggedIn: boolean;
  token?: string;
  className?: string;
}

export function ReporteModal({ unidadId, isLoggedIn, token, className = '' }: ReporteModalProps) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  const handleOpenClick = (e: React.MouseEvent) => {
    if (!isLoggedIn || !token) {
      e.preventDefault();
      const loginUrl = pathname.includes('/pt') 
        ? '/pt/auth/login' 
        : pathname.includes('/en') 
          ? '/en/auth/login' 
          : '/es/auth/login';
          
      router.push(`${loginUrl}?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reportes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ unidad_id: unidadId, motivo }),
      });

      if (!res.ok) {
        throw new Error('Error al enviar el reporte');
      }

      setOpen(false);
      setMotivo('');
      alert('Reporte enviado correctamente. Nuestro equipo lo revisará a la brevedad.');
    } catch (error) {
      console.error(error);
      alert('Hubo un error al enviar el reporte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-muted-foreground hover:text-red-600 ${className}`}
            onClick={handleOpenClick}
          >
            <Flag className="h-4 w-4 mr-2" />
            Reportar
          </Button>
        } 
      />
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reportar publicación</DialogTitle>
          <DialogDescription>
            ¿Por qué querés reportar esta unidad? Seleccioná un motivo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo del reporte</Label>
            <Select value={motivo} onValueChange={(val) => setMotivo(val || '')} required>
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Seleccioná un motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fraude">Posible estafa o fraude</SelectItem>
                <SelectItem value="falso">Datos falsos o incorrectos</SelectItem>
                <SelectItem value="no_disponible">La unidad ya no está disponible</SelectItem>
                <SelectItem value="ofensivo">Contenido ofensivo o inapropiado</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!motivo || isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
