import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import FacturacionView from '@/components/gestor/FacturacionView';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { getServerAccessContext } from '@/lib/access-context';

interface FacturacionPageProps {
  searchParams?: {
    state?: string;
    status?: string;
    modal?: string;
  };
}

export default async function FacturacionPage({ searchParams }: FacturacionPageProps) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { user, accessToken: token } = await getServerAuth(cookieStore, supabase);

  if (!token) {
    return <div className="p-8 text-sm font-mono text-destructive">No autenticado</div>;
  }

  let rol = user?.user_metadata?.role || user?.user_metadata?.rol;
  if (!rol && user?.id) {
    try {
      const timeoutPromise = new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 600));
      const res = await Promise.race([
        supabase.from('users').select('rol').eq('id', user.id).single(),
        timeoutPromise,
      ]);
      if (res && 'data' in res && (res.data as { rol?: string })?.rol) {
        rol = (res.data as { rol?: string }).rol;
      }
    } catch {}
  }

  const accessContext = await getServerAccessContext(token);

  // Bloquear inmediatamente al Delegado antes de cualquier fetch protegido
  if (accessContext?.actor === 'delegado' || rol === 'delegado') {
    return (
      <div data-testid="owner-only-forbidden" className="p-8 text-center space-y-4 max-w-md mx-auto mt-12 bg-card border rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-destructive">Acceso Restringido</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Como delegado tienes acceso operativo a las unidades pero la facturación y medios de pago están reservados al Gestor titular.
        </p>
      </div>
    );
  }

  if (process.env.RENDO_BETA_MODE === 'true') {
    return (
      <div data-testid="beta-payments-disabled" className="mx-auto mt-12 max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Facturación no disponible en la beta</h1>
        <p className="mt-3 text-sm text-muted-foreground">Esta versión es solo para probar el producto. No se pueden comprar cupos ni registrar pagos.</p>
      </div>
    );
  }

  if (searchParams?.state === 'api-error') {
    return (
      <div data-testid="facturacion-api-error" className="p-8 text-center space-y-4 max-w-md mx-auto mt-12 bg-card border border-destructive/30 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-destructive">Error al Conectar con Facturación</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          No fue posible sincronizar el cupo y las pasarelas de pago. Verifique su conexión y reintente.
        </p>
        <div className="pt-2">
          <a
            href="?state="
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Reintentar Conexión
          </a>
        </div>
      </div>
    );
  }

  const fetchOptions = {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store' as RequestCache,
    signal: AbortSignal.timeout(2000),
  };

  let cupo = null;
  try {
    const cupoRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cupo`, fetchOptions);
    if (cupoRes.ok) {
      cupo = await cupoRes.json();
    }
  } catch (err) {
    console.warn('Cupo fetch failed or timed out:', err);
  }

  if (!cupo) {
    return (
      <div data-testid="facturacion-api-error" className="p-8 text-center space-y-4 max-w-md mx-auto mt-12 bg-card border border-border/80 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-foreground">Servicio No Disponible</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          No se pudieron cargar los datos de cupo y facturación en este momento. Por favor, reintenta más tarde.
        </p>
        <div className="pt-2">
          <a
            href="?state="
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Reintentar
          </a>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <FacturacionView cupo={cupo} token={token} initialState={searchParams?.modal || searchParams?.state} />
    </Suspense>
  );
}
