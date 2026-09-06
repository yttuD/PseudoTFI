import { UnidadForm } from '@/components/gestor/UnidadForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

export default async function EditarUnidadPage({ params: { locale, id } }: { params: { locale: string, id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        }
      }
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch Unidad
  let unidad = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${id}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      cache: 'no-store'
    });
    if (res.ok) {
      unidad = await res.json();
    } else {
      redirect(`/${locale}/mis-unidades`);
    }
  } catch {
    redirect(`/${locale}/mis-unidades`);
  }

  // Fetch Zonas
  let zonas = [];
  try {
    const zonasRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/zonas`, { cache: 'no-store' });
    if (zonasRes.ok) zonas = await zonasRes.json();
  } catch {}

  // Fetch Grupos
  let grupos = [];
  try {
    const gruposRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/grupos`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      cache: 'no-store'
    });
    if (gruposRes.ok) grupos = await gruposRes.json();
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Editar Unidad</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Modificá los datos de tu unidad</CardTitle>
        </CardHeader>
        <CardContent>
          <UnidadForm 
            initialData={unidad}
            unidadId={id}
            locale={locale} 
            zonas={zonas} 
            grupos={grupos} 
            token={session.access_token} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
