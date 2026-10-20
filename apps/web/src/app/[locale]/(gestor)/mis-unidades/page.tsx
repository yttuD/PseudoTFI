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
import { fetchMisUnidades, fetchMisGrupos } from '@/lib/inventory-loader';
import { InventoryLoadError } from '@/components/gestor/InventoryLoadError';
import { getTranslations } from 'next-intl/server';

interface PageProps {
  params: { locale: string };
  searchParams?: { page?: string; limit?: string };
}

export default async function MisUnidadesPage({ params: { locale }, searchParams }: PageProps) {
  const t = await getTranslations({ locale, namespace: 'Inventario' });
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

  const parsedPage =
    typeof searchParams?.page === 'string' && /^\d+$/.test(searchParams.page.trim())
      ? parseInt(searchParams.page.trim(), 10)
      : 1;
  const parsedLimit =
    typeof searchParams?.limit === 'string' && /^\d+$/.test(searchParams.limit.trim())
      ? parseInt(searchParams.limit.trim(), 10)
      : 12;

  const page = Math.max(1, parsedPage);
  const limit = Math.max(1, Math.min(100, parsedLimit));

  const [unidadesResult, gruposResult] = await Promise.all([
    fetchMisUnidades(token, page, limit),
    fetchMisGrupos(token),
  ]);

  // Si cualquiera de los dos falla, mostrar error para no corromper la vista con datos parciales
  if (!unidadesResult.ok || !gruposResult.ok) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-sans">
              {t('titulo')}
            </h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              {t('subtitulo')}
            </p>
          </div>
        </div>
        <InventoryLoadError />
      </div>
    );
  }

  // Count > 0 en otra página no es inventario vacío: solo está vacío si count === 0 y 0 grupos
  const isGloballyEmpty = unidadesResult.count === 0 && gruposResult.data.length === 0;

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight font-sans">
              {t('titulo')}
            </h1>
            {isReadOnly && (
              <Badge data-testid="readonly-badge" variant="outline" className="border-[#B89355]/60 text-[#131F3C] dark:border-[#B89355] dark:text-[#B89355] font-mono text-xs flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {t('modoLectura')}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {t('subtitulo')}
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
              {t('nuevaUnidad')}
            </Link>
          )}
        </div>
      </div>

      {isGloballyEmpty ? (
        <div data-testid="inventory-empty" className="bg-card rounded-2xl border border-border shadow-sm p-8">
          <p className="mb-4 text-sm text-muted-foreground font-mono">
            {t('totalMostrado', { mostrado: 0, total: unidadesResult.count, grupos: gruposResult.data.length })}
          </p>
          <EmptyState 
            icon={Building2}
            title={t('vacioTitulo')}
            description={t('vacioDescripcion')}
            action={
              canCreateUnidad ? (
                <Link href={`/${locale}/mis-unidades/nueva`} className={buttonVariants({ className: 'min-h-[44px] min-w-[44px] inline-flex items-center justify-center' })}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('registrarUnidad')}
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <BentoGruposGrid
          unidades={unidadesResult.data}
          grupos={gruposResult.data}
          locale={locale}
          token={token || ''}
          isReadOnly={isReadOnly}
          canCreateGrupo={canCreateGrupo}
          canCreateUnidad={canCreateUnidad}
          pagination={{
            page: unidadesResult.page,
            limit: unidadesResult.limit,
            total: unidadesResult.count,
          }}
        />
      )}
    </div>
  );
}
