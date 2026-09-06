import { createServerClient } from '@supabase/ssr';
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

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let alquileres: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unidades: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inquilinos: any[] = [];

  if (token) {
    const fetchOptions = {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store' as RequestCache,
    };

    const [alqRes, uniRes, inqRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/alquileres?limit=1000`, fetchOptions),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades?limit=1000`, fetchOptions),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/inquilinos?limit=1000`, fetchOptions),
    ]);

    if (alqRes.ok) {
      const json = await alqRes.json();
      alquileres = json.data || [];
    }
    if (uniRes.ok) {
      const json = await uniRes.json();
      unidades = json.data || [];
    }
    if (inqRes.ok) {
      const json = await inqRes.json();
      inquilinos = json.data || [];
    }
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Alquileres</h1>
          <p className="text-muted-foreground mt-1">
            Administrá todos los contratos y reservas de tus unidades.
          </p>
        </div>
        {token && (
          <AlquilerFormModal token={token} unidades={unidades} inquilinos={inquilinos} />
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidad</TableHead>
              <TableHead>Inquilino</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Monto Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alquileres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay alquileres registrados.
                </TableCell>
              </TableRow>
            ) : (
              alquileres.map((alq) => (
                <TableRow key={alq.id}>
                  <TableCell className="font-medium">{alq.unidad?.titulo_es || 'Unidad'}</TableCell>
                  <TableCell>{alq.inquilino?.nombre_completo || 'Inquilino'}</TableCell>
                  <TableCell>{new Date(alq.fecha_inicio).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(alq.fecha_fin).toLocaleDateString()}</TableCell>
                  <TableCell>${alq.monto_total}</TableCell>
                  <TableCell>{getStatusBadge(alq.estado)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
