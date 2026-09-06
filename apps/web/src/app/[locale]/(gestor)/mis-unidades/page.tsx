import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Plus, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

async function getMisUnidades() {
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
  if (!session?.access_token) return [];

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    },
    cache: 'no-store'
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

const ESTADO_STYLES: Record<string, string> = {
  borrador:           'bg-gray-100 text-gray-600 hover:bg-gray-100 border-transparent',
  publicada:          'bg-green-100 text-green-800 hover:bg-green-100 border-transparent',
  pausada:            'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-transparent',
  no_disponible:      'bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-transparent',
  en_revision:        'bg-orange-100 text-orange-800 hover:bg-orange-100 border-transparent',
  suspendida:         'bg-red-100 text-red-800 hover:bg-red-100 border-transparent',
  archivada:          'border-border text-muted-foreground hover:bg-transparent bg-transparent',
  bloqueada_por_impago: 'bg-red-900 text-white hover:bg-red-900 border-transparent',
};

export default async function MisUnidadesPage({ params: { locale } }: { params: { locale: string } }) {
  const unidades = await getMisUnidades();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Unidades</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tus propiedades y publicaciones.
          </p>
        </div>
        <Link href={`/${locale}/mis-unidades/nueva`} className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Unidad
        </Link>
      </div>

      <div className="grid gap-4">
        {unidades.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-lg bg-background">
            <h3 className="text-lg font-medium">No tienes unidades todavía</h3>
            <p className="text-muted-foreground mt-2 mb-4">Crea tu primera unidad para empezar a recibir inquilinos.</p>
            <Link href={`/${locale}/mis-unidades/nueva`} className={buttonVariants({ variant: 'outline' })}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Unidad
            </Link>
          </div>
        ) : (
          unidades.map((unidad: { id: string; titulo_es?: string; estado: string; categoria?: unknown; zonas?: unknown }) => (
            <Card key={unidad.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">{unidad.titulo_es || 'Sin título'}</h3>
                  <Badge 
                    className={`whitespace-nowrap ${ESTADO_STYLES[unidad.estado] || ESTADO_STYLES.borrador}`}
                  >
                    {unidad.estado.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(typeof unidad.categoria === 'string' ? unidad.categoria : (unidad.categoria as any)?.nombre)} • {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}{(unidad.zonas as any)?.nombre}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Link href={`/${locale}/mis-unidades/${unidad.id}/editar`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Editar
                </Link>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
