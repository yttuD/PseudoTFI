import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { getServerAccessContext } from '@/lib/access-context';
import { cookies } from 'next/headers';
import { Building2, Plus, Eye } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BentoGruposGrid } from '@/components/gestor/BentoGruposGrid';
import { GrupoFormModal } from '@/components/gestor/GrupoFormModal';
import { Badge } from '@/components/ui/badge';

async function getMisUnidades(accessToken: string | null) {
  if (!accessToken) return [];

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) return data.data;
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.warn('Error fetching unidades:', e);
  }

  // Fail closed: No demo fallback
  return [];
}

async function getMisGrupos(accessToken: string | null) {
  if (!accessToken) return [];

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/grupos`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {
    console.warn('Error fetching grupos:', e);
  }

  // Fail closed: No demo fallback
  return [];
}

export default async function MisUnidadesPage({ params: { locale } }: { params: { locale: string } }) {
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

  const { accessToken: token } = await getServerAuth(cookieStore, supabase);
  const accessContext = await getServerAccessContext(token);

  const isDelegado = accessContext?.actor === 'delegado';
  const isReadOnly = isDelegado && (accessContext.state !== 'activo' || accessContext.permiso === 'ver');
  const canCreateGrupo =
    accessContext?.actor === 'gestor' ||
    (isDelegado &&
      accessContext.state === 'activo' &&
      accessContext.permiso === 'gestionar' &&
      accessContext.scope.alcanceTipo === 'cuenta');
  const canCreateUnidad =
    accessContext?.actor === 'gestor' ||
    (isDelegado &&
      accessContext.state === 'activo' &&
      accessContext.permiso === 'gestionar' &&
      (accessContext.scope.alcanceTipo === 'cuenta' || accessContext.scope.alcanceTipo === 'grupo'));

  const [unidades, grupos] = await Promise.all([
    getMisUnidades(token),
    getMisGrupos(token),
  ]);

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight font-sans">
              Inventario &amp; Grupos
            </h1>
            {isReadOnly && (
              <Badge data-testid="readonly-badge" variant="outline" className="border-[#B89355] text-[#B89355] font-mono text-xs flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Modo Solo Lectura
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            Gestión centralizada de edificios, complejos y unidades operativas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {token && canCreateGrupo && <GrupoFormModal token={token} />}
          {canCreateUnidad && (
            <Link
              href={`/${locale}/mis-unidades/nueva`}
              className={buttonVariants({ className: 'min-h-[44px] min-w-[44px] inline-flex items-center justify-center' })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Unidad
            </Link>
          )}
        </div>
      </div>

      {unidades.length === 0 && grupos.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          <EmptyState 
            icon={Building2}
            title="Inventario Vacío"
            description="No hay unidades registradas en tu workspace accesible."
            action={
              canCreateUnidad ? (
                <Link href={`/${locale}/mis-unidades/nueva`} className={buttonVariants()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Unidad
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <BentoGruposGrid
          unidades={unidades}
          grupos={grupos}
          locale={locale}
          token={token || ''}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}
