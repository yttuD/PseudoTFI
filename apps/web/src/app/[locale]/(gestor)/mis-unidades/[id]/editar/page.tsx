import { UnidadForm } from '@/components/gestor/UnidadForm';
import { AlertTriangle } from 'lucide-react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { getServerAccessContext } from '@/lib/access-context';

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

  const { user, accessToken } = await getServerAuth(cookieStore, supabase);
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const accessContext = await getServerAccessContext(accessToken);
  if (accessContext?.actor === 'delegado' && (accessContext.state !== 'activo' || accessContext.permiso === 'ver')) {
    redirect(`/${locale}/mis-unidades?denied=read-only`);
  }

  // Fetch Unidad
  let unidad = null;
  let notFound = false;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades/${id}`, {
      headers: { 'Authorization': `Bearer ${accessToken || ''}` },
      cache: 'no-store'
    });
    if (res.ok) {
      unidad = await res.json();
    } else {
      notFound = true;
    }
  } catch {
    notFound = true;
  }

  if (notFound || !unidad) {
    redirect(`/${locale}/mis-unidades`);
  }

  // Fetch Zonas
  let zonas = [];
  try {
    const zonasRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/zonas`, { cache: 'no-store' });
    if (zonasRes.ok) {
      const zJson = await zonasRes.json();
      zonas = Array.isArray(zJson) ? zJson : (zJson.data || []);
    }
  } catch {}

  // Fetch Grupos
  let grupos = [];
  try {
    const gruposRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/grupos`, {
      headers: { 'Authorization': `Bearer ${accessToken || ''}` },
      cache: 'no-store'
    });
    if (gruposRes.ok) {
      const gJson = await gruposRes.json();
      grupos = Array.isArray(gJson) ? gJson : (gJson.data || []);
    }
  } catch {}

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Editar Unidad
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Modificá los datos, fotos, tarifas y ubicación geográfica de tu unidad.
          </p>
        </div>
      </div>

      {(unidad?.estado === 'en_revision' || unidad?.estado === 'suspendida') && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">
              {unidad.estado === 'en_revision' ? 'Unidad en Proceso de Moderación y Revisión' : 'Unidad Temporalmente Suspendida'}
            </h4>
            <p className="text-xs opacity-90 leading-relaxed">
              Esta unidad se encuentra temporalmente en revisión o pausada. Puedes actualizar la información, fotos y precios para acelerar la verificación.
            </p>
          </div>
        </div>
      )}

      <UnidadForm 
        initialData={unidad}
        unidadId={id}
        locale={locale} 
        zonas={zonas} 
        token={accessToken || ''} 
        grupos={grupos}
      />
    </div>
  );
}
