'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Building2, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export default function OnboardingGestorPage() {
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvertirAGestor = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Iniciá sesión para continuar.');

      // Canonical role and trial quota change atomically on the database.
      const { error: convertError } = await supabase.rpc('become_gestor');
      if (convertError) throw convertError;

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/dashboard`);
        router.refresh();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el perfil. Intenta nuevamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow decorativo de fondo */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-card border border-border/60 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-center">
        {/* Brand Header */}
        <div className="flex justify-center mb-1">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 min-h-[44px] min-w-[44px]">
            <Image
              src="/brand/rendo-logo-horizontal-light.svg"
              alt="Rendo"
              width={130}
              height={42}
              priority
              className="h-9 w-auto dark:hidden"
            />
            <Image
              src="/brand/rendo-logo-horizontal-dark.svg"
              alt="Rendo"
              width={130}
              height={42}
              priority
              className="h-9 w-auto hidden dark:block"
            />
          </Link>
        </div>

        {/* Badge superior */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 mx-auto">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Acceso Administrativo Requerido</span>
        </div>

        {/* Encabezado */}
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-inner">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            ¿Deseas convertirte en Gestor?
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu cuenta actual está registrada como <span className="text-foreground font-semibold">Inquilino / Buscador</span>.
            Para acceder al panel de control, publicar unidades y gestionar contratos, activa tu rol de Gestor.
          </p>
        </div>

        {/* Beneficios */}
        <div className="bg-muted/30 rounded-2xl p-4 text-left border border-border/30 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-foreground">3 Unidades de Cupo Trial</span>
              <p className="text-[11px] text-muted-foreground">Publica de inmediato hasta 3 Unidades sin costo alguno.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-foreground">Gestión Integral de Alquileres</span>
              <p className="text-[11px] text-muted-foreground">Administra alquileres, cobros, inquilinos y Delegados.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-foreground">Sin Compromisos</span>
              <p className="text-[11px] text-muted-foreground">Mantienes acceso completo al Marketplace con la misma cuenta.</p>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-500 font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
            {error}
          </p>
        )}

        {/* Acciones */}
        <div className="space-y-3 pt-2">
          <Button
            type="button"
            onClick={handleConvertirAGestor}
            disabled={loading || success}
            className="w-full min-h-[48px] h-auto py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all flex items-center justify-center gap-2 text-center whitespace-normal leading-snug"
          >
            {loading ? (
              <span>Configurando tu espacio...</span>
            ) : success ? (
              <span>¡Listo! Redirigiendo al Dashboard...</span>
            ) : (
              <>
                <span>Convertirme en Gestor y Activar Cupo Trial</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </>
            )}
          </Button>

          <Link
            href={`/${locale}/unidades`}
            className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium min-h-[44px] py-2 transition-colors w-full"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Volver al Marketplace como Buscador</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
