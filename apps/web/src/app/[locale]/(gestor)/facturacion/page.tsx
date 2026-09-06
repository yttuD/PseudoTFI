import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import FacturacionView from '@/components/gestor/FacturacionView';

export default async function FacturacionPage() {
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

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return <div>No autenticado</div>;
  }

  const fetchOptions = {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store' as RequestCache,
  };

  const cupoRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cupo`, fetchOptions);
  const cupo = cupoRes.ok ? await cupoRes.json() : null;

  if (!cupo) {
    return <div>Error al cargar datos del cupo</div>;
  }

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <FacturacionView cupo={cupo} token={token} />
    </Suspense>
  );
}
