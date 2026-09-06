'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { Loader2, CheckCircle2, CreditCard, Banknote } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FacturacionView({ cupo, token }: { cupo: any, token: string }) {
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [loadingMp, setLoadingMp] = useState(false);
  const [loadingEfectivo, setLoadingEfectivo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('status') === 'approved') {
      alert('¡Pago procesado con éxito! Tu suscripción ha sido renovada.');
    }
  }, [searchParams]);

  const packs = [
    { unidades: 5, precio: 5000, titulo: 'Pack 5 Unidades' },
    { unidades: 10, precio: 9000, titulo: 'Pack 10 Unidades' },
  ];

  const cupoUsado = cupo.cupo_usado || 0;
  const cupoMaximo = cupo.cupo_maximo || 1;
  const progressValue = Math.min(100, Math.round((cupoUsado / cupoMaximo) * 100));

  const handleComprar = (unidades: number) => {
    setSelectedPack(unidades);
    setShowModal(true);
  };

  const handleMercadoPago = async () => {
    if (!selectedPack) return;
    setLoadingMp(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pagos/mercadopago/preferencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cupo_adquirido: selectedPack })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.init_point) {
          window.location.href = data.init_point;
        } else {
          alert('Error: No se obtuvo link de pago');
        }
      } else {
        alert('Error: Ocurrió un error al procesar el pago');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoadingMp(false);
    }
  };

  const handleEfectivo = async () => {
    if (!selectedPack) return;
    setLoadingEfectivo(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pagos/efectivo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cupo_adquirido: selectedPack })
      });
      if (res.ok) {
        alert('Pago informado: Revisaremos la transferencia a la brevedad.');
        setShowModal(false);
      } else {
        alert('Error: Ocurrió un error al registrar el pago');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoadingEfectivo(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="text-muted-foreground mt-2">
          Gestioná tu cupo de unidades y métodos de pago.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado Actual de Cupo</CardTitle>
            <CardDescription>Resumen de unidades publicadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">
                {cupoUsado} de {cupoMaximo} unidades
              </span>
              <span className="text-muted-foreground">
                {cupoMaximo - cupoUsado} disponibles
              </span>
            </div>
            <Progress value={progressValue} className="h-3" />
            
            {cupo.en_trial && (
              <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Estás en periodo de prueba gratuito
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Aumentar Cupo</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packs.map(pack => (
            <Card key={pack.unidades} className="flex flex-col">
              <CardHeader>
                <CardTitle>{pack.titulo}</CardTitle>
                <CardDescription>Adquirí espacio adicional permanente</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-3xl font-bold mb-2">
                  ${pack.precio.toLocaleString('es-AR')}
                </div>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> +{pack.unidades} unidades activas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Sin vencimiento
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleComprar(pack.unidades)}>
                  Comprar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar método de pago</DialogTitle>
            <DialogDescription>
              Estás por adquirir el Pack de {selectedPack} Unidades.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={handleMercadoPago}
              disabled={loadingMp || loadingEfectivo}
            >
              {loadingMp ? <Loader2 className="h-6 w-6 animate-spin" /> : <CreditCard className="h-6 w-6 text-blue-500" />}
              <span className="font-semibold">MercadoPago</span>
              <span className="text-xs text-muted-foreground">Tarjetas y dinero en cuenta</span>
            </Button>
            
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Banknote className="h-5 w-5 text-green-600" />
                Transferencia o Efectivo
              </div>
              <p className="text-sm text-muted-foreground">
                Transferí al CBU <strong>0000000000000000000000</strong> a nombre de RENDA SRL y luego informá el pago.
              </p>
              <Button
                className="w-full"
                variant="secondary"
                onClick={handleEfectivo}
                disabled={loadingMp || loadingEfectivo}
              >
                {loadingEfectivo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Informar Pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
