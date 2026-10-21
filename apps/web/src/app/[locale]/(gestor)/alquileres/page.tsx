import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { cookies } from 'next/headers';
import { AlquilerFormModal } from '@/components/gestor/AlquilerFormModal';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getServerAccessContext } from '@/lib/access-context';
import { Eye } from 'lucide-react';
import { InventoryLoadError } from '@/components/gestor/InventoryLoadError';

export default async function AlquileresPage() {
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

  const { accessToken: token } = await getServerAuth(cookieStore, supabase);
  const accessContext = await getServerAccessContext(token);

  const isDelegado = accessContext?.actor === 'delegado';
  const isReadOnly = isDelegado && (accessContext.state !== 'activo' || accessContext.permiso === 'ver');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let alquileres: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unidades: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inquilinos: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let grupos: any[] = [];

  // Never present a failed request as an empty rental history.
  // Rentals are readable independently of the auxiliary data required to
  // open the creation form, so retain valid results on a partial outage.
  let rentalsLoadError = !token;
  let creationDataError = false;
  if (token) {
    const fetchOptions = {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store' as RequestCache,
      signal: AbortSignal.timeout(10000),
    };

    const loadList = async (endpoint: string, paged: boolean) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, fetchOptions);
      if (!response.ok) throw new Error('No se pudo cargar el listado');
      const json: unknown = await response.json();
      const records = paged && json !== null && typeof json === 'object'
        ? (json as { data?: unknown }).data
        : json;
      if (!Array.isArray(records)) throw new Error('Respuesta de listado inválida');
      return records;
    };

    const [rentalsResult, unitsResult, tenantsResult, groupsResult] = await Promise.allSettled([
      loadList('/alquileres?limit=1000', true),
      loadList('/unidades?limit=1000', true),
      loadList('/inquilinos?limit=1000', true),
      loadList('/grupos', false),
    ]);

    if (rentalsResult.status === 'fulfilled') {
      alquileres = rentalsResult.value;
    } else {
      rentalsLoadError = true;
    }

    if (unitsResult.status === 'fulfilled') unidades = unitsResult.value;
    else creationDataError = true;

    if (tenantsResult.status === 'fulfilled') inquilinos = tenantsResult.value;
    else creationDataError = true;

    if (groupsResult.status === 'fulfilled') grupos = groupsResult.value;
    else creationDataError = true;
  }

  // Fail closed: No demo fake fallbacks

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'activo':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Activo</Badge>;
      case 'finalizado':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Finalizado</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Alquileres</h1>
            {isReadOnly && (
              <Badge data-testid="readonly-badge" variant="outline" className="border-[#B89355] text-[#B89355] font-mono text-xs flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Modo Solo Lectura
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Administrá todos los contratos y reservas de tus unidades.
          </p>
        </div>
        {token && !isReadOnly && !rentalsLoadError && !creationDataError && (
          <AlquilerFormModal token={token} unidades={unidades} inquilinos={inquilinos} grupos={grupos} />
        )}
      </div>

      {rentalsLoadError ? (
        <div data-testid="alquileres-load-error">
          <InventoryLoadError
            title={token ? 'No pudimos cargar los alquileres' : 'No se pudo verificar tu sesión'}
            message={token
              ? 'Tus alquileres no se eliminaron. No pudimos consultar el servicio; reintentá cuando vuelva la conexión.'
              : 'Iniciá sesión nuevamente para consultar tus contratos y reservas.'}
          />
        </div>
      ) : (
        <>
          {creationDataError && (
            <div data-testid="alquileres-creation-data-error">
              <InventoryLoadError
                title="Los alquileres se cargaron, pero faltan datos para registrar uno nuevo"
                message="Podés consultar los contratos existentes. La creación de alquileres está temporalmente deshabilitada hasta recuperar unidades, inquilinos y grupos."
              />
            </div>
          )}
          <div className="rounded-md border bg-card overflow-hidden">
            {alquileres.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-sm">
            No hay alquileres registrados.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead>Período / Horario</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Seña</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alquileres.map((alq) => (
                    <TableRow key={alq.id}>
                      <TableCell className="font-medium">{alq.unidad?.titulo_es || 'Unidad'}</TableCell>
                      <TableCell>{alq.inquilino?.nombre_completo || 'Inquilino'}</TableCell>
                      <TableCell>
                        <span className="capitalize text-xs font-mono px-2 py-0.5 rounded bg-muted/60">
                          {alq.modalidad || 'mensual'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(alq.inicio_at || alq.fecha_inicio).toLocaleDateString()} &rarr; {new Date(alq.fin_at || alq.fecha_fin).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold">${Number(alq.monto_total || 0).toLocaleString('es-AR')}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {Number(alq.monto_sena || 0) > 0 ? `$${Number(alq.monto_sena).toLocaleString('es-AR')}` : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(alq.estado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-border">
              {alquileres.map((alq) => (
                <div key={alq.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm">{alq.unidad?.titulo_es || 'Unidad'}</h4>
                      <p className="text-xs text-muted-foreground">{alq.inquilino?.nombre_completo || 'Inquilino'}</p>
                    </div>
                    {getStatusBadge(alq.estado)}
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1">
                    <span>
                      {new Date(alq.inicio_at || alq.fecha_inicio).toLocaleDateString()} &rarr; {new Date(alq.fin_at || alq.fecha_fin).toLocaleDateString()}
                    </span>
                    <span className="font-bold text-foreground">${Number(alq.monto_total || 0).toLocaleString('es-AR')}</span>
                  </div>
                  {Number(alq.monto_sena || 0) > 0 && (
                    <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
                      Seña: ${Number(alq.monto_sena).toLocaleString('es-AR')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
