import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { cookies } from 'next/headers';
import { MetricasClient } from '@/components/metricas/MetricasClient';

import { getServerAccessContext } from '@/lib/access-context';

export default async function MetricasPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
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

  const { accessToken } = await getServerAuth(cookieStore, supabase);
  const accessContext = await getServerAccessContext(accessToken);

  if (accessContext?.actor !== 'gestor') {
    return (
      <div data-testid="owner-only-forbidden" className="p-8 text-center space-y-4 max-w-md mx-auto mt-12 bg-card border rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-destructive">Acceso Restringido</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Las métricas analíticas e inteligencia comercial de la cuenta están reservadas exclusivamente al Gestor titular.
        </p>
      </div>
    );
  }

  const userRole = 'gestor';

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <MetricasClient
        locale={locale}
        initialToken={accessToken || undefined}
        userRole={userRole}
      />
    </div>
  );
}
