'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, CreditCard, Banknote, Minus, Plus, Sparkles, Percent, ArrowRight } from 'lucide-react';
import { calcularPrecioCompraIncremental, PRICING } from '@/lib/pricing';
import { AnimatedTabs } from '@/components/ui/tabs';

export interface CupoData {
  id?: string;
  cupo_maximo?: number;
  cupo_usado?: number;
  en_trial?: boolean;
  [key: string]: unknown;
}

export default function FacturacionView({
  cupo,
  token,
  initialState,
}: {
  cupo: CupoData;
  token: string;
  initialState?: string;
}) {
  const [unidadesDeseadas, setUnidadesDeseadas] = useState<number>(5);
  const [loadingMp, setLoadingMp] = useState(false);
  const [loadingEfectivo, setLoadingEfectivo] = useState(false);
  const [showModal, setShowModal] = useState(
    initialState === 'FORM-002' ||
      initialState === 'FORM-002-validation-error' ||
      initialState === 'FORM-002-api-error' ||
      initialState === 'FORM-002-success' ||
      initialState === 'validation-error' ||
      initialState === 'api-error'
  );
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'validation';
    message: string;
  } | null>(() => {
    if (initialState === 'FORM-002-validation-error' || initialState === 'validation-error') {
      return {
        type: 'validation',
        message: 'La cantidad de unidades ingresada no es válida para la liquidación.',
      };
    }
    if (initialState === 'FORM-002-api-error' || initialState === 'api-error') {
      return {
        type: 'error',
        message: 'Error de comunicación con la pasarela de pagos. Por favor, verifique y reintente.',
      };
    }
    if (initialState === 'FORM-002-success' || initialState === 'success') {
      return {
        type: 'success',
        message: '¡Pago procesado con éxito! Tu suscripción y cupo han sido actualizados.',
      };
    }
    return null;
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams?.get('status');
    const stateParam = searchParams?.get('state');
    if (status === 'approved' || status === 'success' || stateParam === 'FORM-002-success') {
      setNotification({
        type: 'success',
        message: '¡Pago procesado con éxito! Tu suscripción y cupo han sido actualizados.',
      });
    } else if (stateParam === 'FORM-002-api-error' || stateParam === 'api-error') {
      setNotification({
        type: 'error',
        message: 'Error de comunicación con la pasarela de pagos. Por favor, verifique y reintente.',
      });
      setShowModal(true);
    } else if (stateParam === 'FORM-002-validation-error' || stateParam === 'validation-error') {
      setNotification({
        type: 'validation',
        message: 'La cantidad de unidades ingresada no es válida para la liquidación.',
      });
      setShowModal(true);
    }
  }, [searchParams]);

  const cupoUsado = cupo?.cupo_usado || 0;
  const cupoMaximo = cupo?.cupo_maximo || 0;
  const progressValue = cupoMaximo > 0 ? Math.min(100, Math.round((cupoUsado / cupoMaximo) * 100)) : 0;

  // Cálculo incremental sobre el total de la cuenta
  const calculo = calcularPrecioCompraIncremental(cupoMaximo, unidadesDeseadas);

  const handleIncrement = () => {
    setUnidadesDeseadas((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setUnidadesDeseadas((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleSetQuickUnits = (qty: number) => {
    setUnidadesDeseadas(qty);
  };

  const handleComprar = () => {
    if (unidadesDeseadas < 1) {
      setNotification({
        type: 'validation',
        message: 'Debe seleccionar al menos 1 unidad para continuar con la compra de cupo.',
      });
      return;
    }
    setShowModal(true);
  };

  const handleMercadoPago = async () => {
    setLoadingMp(true);
    setNotification(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pagos/mercadopago/preferencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cupo_adquirido: calculo.cupoAdicional }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.init_point) {
          window.location.href = data.init_point;
        } else {
          setNotification({
            type: 'error',
            message: 'No se obtuvo el enlace de pago de Mercado Pago. Reintente.',
          });
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setNotification({
          type: 'error',
          message: `Error al procesar el pago: ${errJson.message || 'Fallo de pasarela'}`,
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Error de conexión con la pasarela de pagos. Verifique su red.',
      });
    } finally {
      setLoadingMp(false);
    }
  };

  const handleEfectivo = async () => {
    setLoadingEfectivo(true);
    setNotification(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pagos/efectivo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cupo_adquirido: calculo.cupoAdicional }),
      });
      if (res.ok) {
        setNotification({
          type: 'success',
          message: 'Pago informado con éxito. Revisaremos la transferencia a la brevedad para acreditar tu cupo.',
        });
      } else {
        setNotification({
          type: 'error',
          message: 'Error al registrar la notificación de transferencia bancaria.',
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Error de conexión al registrar la transferencia.',
      });
    } finally {
      setLoadingEfectivo(false);
    }
  };

  return (
    <div data-testid="facturacion-container" className="space-y-8 max-w-full overflow-hidden">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#131F3C] dark:text-[#F5F3EE]">Facturación</h1>
        <p className="text-muted-foreground dark:text-[#AEB7C7] mt-2">
          Gestioná tu cupo de unidades activas con precios oficiales y descuentos por volumen.
        </p>
      </div>

      {/* Global Notification Banner if present */}
      {notification?.type === 'success' && !showModal && (
        <div
          data-testid="FORM-002-success"
          className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 text-sm font-medium"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Estado Actual del Cupo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm border border-border/80 dark:border-[#293956] dark:bg-[#131F3C]">
          <CardHeader className="p-5 sm:p-6 pb-2">
            <CardTitle className="text-foreground dark:text-[#F5F3EE]">Estado Actual de Cupo</CardTitle>
            <CardDescription className="dark:text-[#AEB7C7]">Unidades activas simultáneas en tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 pt-0">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground dark:text-[#F5F3EE]">
                {cupoUsado} de {cupoMaximo} unidades activas
              </span>
              <span className="text-muted-foreground dark:text-[#AEB7C7] font-mono">
                {Math.max(0, cupoMaximo - cupoUsado)} disponibles para crear o publicar
              </span>
            </div>
            <Progress value={progressValue} className="h-3" />

            {cupo.en_trial && (
              <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Estás en periodo de prueba gratuito ({PRICING.TRIAL_MAX_UNITS} unidades incluidas)
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selector Dinámico de Cupo con Descuento por Volumen */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-[#131F3C] dark:text-[#F5F3EE]">
            <Sparkles className="h-5 w-5 text-primary" />
            {cupoMaximo > 0 ? 'Ampliar o Renovar Cupo de Unidades' : 'Adquirir Cupo de Unidades'}
          </h2>
          <p className="text-sm text-muted-foreground dark:text-[#AEB7C7] mt-1">
            Precio base: ${PRICING.BASE_PRICE_PER_UNIT_ARS.toLocaleString('es-AR')} ARS/mes por Unidad. El descuento por volumen aplica sobre el total consolidado de tu cuenta.
            {cupoMaximo > 0 && ` (Tu cuenta cuenta con ${cupoMaximo} unidades activas)`}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Card Interactiva de Configuración de Cantidad */}
          <Card className="lg:col-span-2 border border-border/80 dark:border-[#293956] dark:bg-[#131F3C] shadow-sm">
            <CardHeader className="p-5 sm:p-6 pb-2">
              <CardTitle className="text-lg text-foreground dark:text-[#F5F3EE]">
                {cupoMaximo > 0 ? '¿Cuántas unidades adicionales deseás sumar?' : 'Seleccioná la cantidad de unidades'}
              </CardTitle>
              <CardDescription className="dark:text-[#AEB7C7]">
                Ingresá la cantidad a sumar o elegí uno de los accesos rápidos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0 space-y-6">
              {/* Botones de selección rápida */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-mono uppercase text-muted-foreground dark:text-[#AEB7C7] self-center mr-2">Accesos rápidos:</span>
                {[1, 3, 5, 10, 15, 20].map((qty) => (
                  <Button
                    key={qty}
                    type="button"
                    variant={unidadesDeseadas === qty ? 'default' : 'outline'}
                    size="sm"
                    className="font-mono min-h-[44px] min-w-[44px] px-3 py-2 text-xs"
                    onClick={() => handleSetQuickUnits(qty)}
                  >
                    +{qty} {qty === 1 ? 'Unidad' : 'Unidades'}
                  </Button>
                ))}
              </div>

              {/* Input Numérico con botones Increment/Decrement */}
              <div className="flex items-center gap-3 max-w-sm">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 min-h-[44px] min-w-[44px] shrink-0 rounded-lg"
                  onClick={handleDecrement}
                  disabled={unidadesDeseadas <= 1}
                  aria-label="Disminuir unidades"
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <div className="relative flex-1">
                  <Input
                    type="number"
                    min={1}
                    value={unidadesDeseadas}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setUnidadesDeseadas(isNaN(val) || val < 1 ? 1 : val);
                    }}
                    className="h-12 text-center text-xl font-mono font-bold min-h-[44px]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground dark:text-[#AEB7C7] pointer-events-none font-mono">
                    Adicionales
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 min-h-[44px] min-w-[44px] shrink-0 rounded-lg"
                  onClick={handleIncrement}
                  aria-label="Aumentar unidades"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Escala de Tramos Informativa */}
              <div className="rounded-lg border border-border/70 dark:border-[#293956] bg-muted/30 dark:bg-[#182747]/50 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground dark:text-[#AEB7C7]">
                  <span>Escala de descuentos sobre el total de la cuenta</span>
                  <span>Sin techo (+5% c/ 5 unid.)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className={`p-2.5 rounded border text-center transition-colors ${calculo.descuentoResultantePorcentaje === 0 ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-background dark:bg-[#101B37]'}`}>
                    <div>1 - 4 U.</div>
                    <div className="font-mono text-muted-foreground dark:text-[#AEB7C7] mt-0.5">0% OFF</div>
                  </div>
                  <div className={`p-2.5 rounded border text-center transition-colors ${calculo.descuentoResultantePorcentaje === 10 ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-background dark:bg-[#101B37]'}`}>
                    <div>5 - 9 U.</div>
                    <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">10% OFF</div>
                  </div>
                  <div className={`p-2.5 rounded border text-center transition-colors ${calculo.descuentoResultantePorcentaje === 15 ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-background dark:bg-[#101B37]'}`}>
                    <div>10 - 14 U.</div>
                    <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">15% OFF</div>
                  </div>
                  <div className={`p-2.5 rounded border text-center transition-colors ${calculo.descuentoResultantePorcentaje >= 20 ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-background dark:bg-[#101B37]'}`}>
                    <div>15+ U.</div>
                    <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">20%+ OFF</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen Financiero en Vivo (Sticky / Destacado) */}
          <Card className="border border-border/80 dark:border-[#293956] dark:bg-[#131F3C] shadow-sm bg-card flex flex-col justify-between">
            <CardHeader className="p-5 sm:p-6 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-foreground dark:text-[#F5F3EE]">Resumen de Liquidación</CardTitle>
                {calculo.descuentoResultantePorcentaje > 0 ? (
                  <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 text-xs">
                    <Percent className="h-3 w-3" />
                    {calculo.descuentoResultantePorcentaje}% OFF
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="dark:text-[#AEB7C7]">
                {calculo.cupoActual > 0
                  ? `Incremento: +${calculo.cupoAdicional} U → Total resultante: ${calculo.cupoTotalResultante} U`
                  : `Plan inicial de ${calculo.cupoTotalResultante} unidades activas`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
              <div className="space-y-2 text-sm border-b border-border/60 dark:border-[#293956] pb-4">
                {calculo.cupoActual > 0 && (
                  <div className="flex justify-between text-muted-foreground dark:text-[#AEB7C7]">
                    <span>Cupo actual ({calculo.cupoActual} u.):</span>
                    <span className="font-mono">${calculo.precioTotalActual.toLocaleString('es-AR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground dark:text-[#AEB7C7]">
                  <span>Nuevo total mensual ({calculo.cupoTotalResultante} u.):</span>
                  <span className="font-mono">${calculo.precioTotalResultante.toLocaleString('es-AR')}</span>
                </div>
                {calculo.descuentoResultantePorcentaje > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Descuento por escala total:</span>
                    <span className="font-mono">{calculo.descuentoResultantePorcentaje}% OFF</span>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <div className="text-xs font-mono uppercase text-muted-foreground dark:text-[#AEB7C7]">
                  {calculo.cupoActual > 0 ? 'Diferencia a abonar hoy (Delta):' : 'Total mensual a pagar:'}
                </div>
                <div className="text-3xl font-extrabold font-mono text-foreground dark:text-[#F5F3EE] mt-1">
                  ${calculo.montoACobrar.toLocaleString('es-AR')} <span className="text-xs font-normal text-muted-foreground dark:text-[#AEB7C7]">ARS</span>
                </div>
                <div className="text-xs text-muted-foreground dark:text-[#AEB7C7] font-mono mt-1">
                  Cálculo oficial con descuento sobre el total de la cuenta
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button className="w-full h-12 min-h-[44px] text-sm font-semibold gap-2 shadow-sm" onClick={handleComprar}>
                Continuar al Pago <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Modal de Selección de Método de Pago (FORM-002) */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent data-testid="FORM-002" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground dark:text-[#F5F3EE]">Confirmar y Abonar Cupo</DialogTitle>
            <DialogDescription className="dark:text-[#AEB7C7]">
              {calculo.cupoActual > 0 ? (
                <>
                  Estás por sumar <strong>+{calculo.cupoAdicional} {calculo.cupoAdicional === 1 ? 'Unidad' : 'Unidades'}</strong> a tu cuenta (total resultante: <strong>{calculo.cupoTotalResultante} Unidades</strong> con <strong>{calculo.descuentoResultantePorcentaje}% OFF</strong>).
                  <br />
                  Monto delta a abonar: <strong>${calculo.montoACobrar.toLocaleString('es-AR')} ARS</strong>.
                </>
              ) : (
                <>
                  Estás por contratar Cupo para <strong>{calculo.cupoTotalResultante} {calculo.cupoTotalResultante === 1 ? 'Unidad' : 'Unidades'}</strong> por un total de <strong>${calculo.montoACobrar.toLocaleString('es-AR')} ARS</strong> ({calculo.descuentoResultantePorcentaje}% de descuento aplicado).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Feedback states for FORM-002 */}
          {notification?.type === 'validation' && (
            <div
              data-testid="FORM-002-validation-error"
              className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2"
            >
              <Percent className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{notification.message}</span>
            </div>
          )}

          {notification?.type === 'error' && (
            <div
              data-testid="FORM-002-api-error"
              className="p-3 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center justify-between gap-2"
            >
              <span>{notification.message}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleMercadoPago}
                className="min-h-[44px] min-w-[44px] text-xs font-semibold shrink-0"
              >
                Reintentar
              </Button>
            </div>
          )}

          {notification?.type === 'success' && (
            <div
              data-testid="FORM-002-success"
              className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{notification.message}</span>
            </div>
          )}

          <div className="py-2">
            <AnimatedTabs
              tabs={[
                {
                  title: 'Mercado Pago Checkout Pro',
                  value: 'mercadopago',
                  content: (
                    <div className="space-y-4 pt-2">
                      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2 text-center">
                        <CreditCard className="h-8 w-8 text-primary mx-auto" />
                        <div className="font-semibold text-sm text-foreground dark:text-[#F5F3EE]">
                          Acreditación Inmediata
                        </div>
                        <p className="text-xs text-muted-foreground dark:text-[#AEB7C7] leading-relaxed">
                          Pagá de forma segura con tarjeta de crédito, débito o dinero en tu cuenta de Mercado Pago. Tu cupo se habilita automáticamente.
                        </p>
                      </div>

                      <Button
                        className="w-full h-12 min-h-[44px] text-sm font-semibold shadow-sm"
                        onClick={handleMercadoPago}
                        disabled={loadingMp || loadingEfectivo}
                      >
                        {loadingMp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        Ir a Pagar con Mercado Pago
                      </Button>
                    </div>
                  ),
                },
                {
                  title: 'Pago Manual / Transferencia',
                  value: 'manual',
                  content: (
                    <div className="space-y-4 pt-2">
                      <div className="border border-border/80 dark:border-[#293956] rounded-2xl p-4 space-y-2.5 bg-muted/20 dark:bg-[#182747]/40">
                        <div className="flex items-center gap-2 font-medium text-xs text-foreground dark:text-[#F5F3EE]">
                          <Banknote className="h-4 w-4 text-secondary" />
                          <span>Datos Bancarios Oficiales</span>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground dark:text-[#AEB7C7] space-y-1 bg-surface dark:bg-[#101B37] p-2.5 rounded-xl border border-border/60 dark:border-[#293956]">
                          <div><strong>Titular:</strong> Rendo S.R.L.</div>
                          <div><strong>CUIT:</strong> 30-71829384-9</div>
                          <div><strong>CBU:</strong> 0000003100010000000000</div>
                          <div><strong>Alias:</strong> RENDO.GOYA.PAGOS</div>
                        </div>
                        <p className="text-[11px] text-muted-foreground dark:text-[#AEB7C7] leading-relaxed">
                          Al informar el pago, nuestro equipo de administración validará la acreditación en horario bancario.
                        </p>
                      </div>

                      <Button
                        className="w-full h-12 min-h-[44px] text-sm font-semibold"
                        variant="secondary"
                        onClick={handleEfectivo}
                        disabled={loadingMp || loadingEfectivo}
                      >
                        {loadingEfectivo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
                        Informar Pago por Transferencia
                      </Button>
                    </div>
                  ),
                },
              ]}
              defaultValue="mercadopago"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
