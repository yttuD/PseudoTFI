import { UnidadForm } from '@/components/gestor/UnidadForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

export default async function NuevaUnidadPage({ params: { locale } }: { params: { locale: string } }) {
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

  // Fetch Zonas
  let zonas = [];
  try {
    const zonasRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/zonas`, { cache: 'no-store' });
    if (zonasRes.ok) zonas = await zonasRes.json();
  } catch (e) {
    console.error("Error fetching zonas", e);
  }

  // Fetch Grupos
  let grupos = [];
  try {
    const gruposRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/grupos`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      cache: 'no-store'
    });
    if (gruposRes.ok) grupos = await gruposRes.json();
  } catch (e) {
    console.error("Error fetching grupos", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Nueva Unidad</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Completá los datos de tu nueva unidad</CardTitle>
        </CardHeader>
        <CardContent>
          <UnidadForm 
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
