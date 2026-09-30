import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { cookies } from 'next/headers';
import { getServerAccessContext } from '@/lib/access-context';
import { FacturacionAfipClient, ComprobanteItem } from '@/components/gestor/FacturacionAfipClient';

interface FacturacionAfipPageProps {
  searchParams?: {
    state?: string;
    [key: string]: string | undefined;
  };
}

export default async function FacturacionAfipPage({ searchParams }: FacturacionAfipPageProps) {
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

  let rol = user?.user_metadata?.role || user?.user_metadata?.rol || 'gestor';
  if (user?.id && !user?.user_metadata?.role) {
    try {
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 300));
      const queryPromise = supabase
        .from('users')
        .select('rol')
        .eq('id', user.id)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await Promise.race([queryPromise, timeoutPromise]);
      if (res?.data?.rol) rol = res.data.rol;
    } catch {}
  }

  const accessContext = await getServerAccessContext(token);

  if (
    accessContext?.actor === 'delegado' ||
    rol === 'delegado' ||
    user?.email?.toLowerCase().includes('delegado') ||
    user?.id === '33333333-3333-3333-3333-333333333333'
  ) {
    return (
      <div data-testid="owner-only-forbidden" className="p-8 text-center space-y-4 max-w-md mx-auto mt-12 bg-card border border-border/80 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-destructive">Acceso Restringido</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          La emisión de comprobantes fiscales AFIP y la configuración tributaria del emisor están reservadas al Gestor titular del workspace.
        </p>
      </div>
    );
  }

  if (process.env.RENDO_BETA_MODE === 'true') {
    return (
      <div data-testid="beta-fiscal-disabled" className="mx-auto mt-12 max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Emisión fiscal no disponible en la beta</h1>
        <p className="mt-3 text-sm text-muted-foreground">Los comprobantes de esta aplicación no tienen validez fiscal. La emisión está deshabilitada durante las pruebas.</p>
      </div>
    );
  }

  if (searchParams?.state === 'api-error') {
    return (
      <div data-testid="afip-api-error" className="p-8 text-center space-y-4 max-w-md mx-auto mt-12 bg-card border border-destructive/30 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-destructive">Error en Servicio Fiscal AFIP</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          No fue posible conectar con los servicios de ARCA / AFIP. Por favor verifique su conexión o reintente más tarde.
        </p>
        <div className="pt-2">
          <a
            href="?state="
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Reintentar Conexión AFIP
          </a>
        </div>
      </div>
    );
  }

  let initialComprobantes: ComprobanteItem[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let alquileres: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let initialConfig: any = null;

  if (token && searchParams?.state !== 'empty') {
    const fetchOptions = {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store' as RequestCache,
      signal: AbortSignal.timeout(2000),
    };

    try {
      const [cmpRes, alqRes, cfgRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/afip/comprobantes`, fetchOptions),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/alquileres?limit=100`, fetchOptions),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/afip/config`, fetchOptions),
      ]);

      if (cmpRes.ok) {
        initialComprobantes = await cmpRes.json();
      }

      if (alqRes.ok) {
        const alqJson = await alqRes.json();
        alquileres = alqJson.data || [];
      }

      if (cfgRes.ok) {
        initialConfig = await cfgRes.json();
      }
    } catch (e) {
      console.error('Error fetching AFIP data:', e);
    }
  }

  return (
    <FacturacionAfipClient
      token={token || ''}
      initialComprobantes={initialComprobantes}
      alquileres={alquileres}
      initialConfig={initialConfig}
      initialState={searchParams?.state}
    />
  );
}
