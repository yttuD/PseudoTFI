import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import DelegadoFormModal from './DelegadoFormModal';

export default async function DelegadosPage() {
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // First check if current user is gestor
  const { data: currentUser } = await supabase
    .from('users')
    .select('rol')
    .eq('id', session.user.id)
    .single();

  if (currentUser?.rol !== 'gestor') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-destructive mb-4">Acceso Denegado</h1>
        <p>Solo el gestor principal puede gestionar delegados.</p>
      </div>
    );
  }

  // Fetch delegados from API using the session token
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delegados`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });

  const { activos = [], pendientes = [] } = res.ok ? await res.json() : {};

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delegados</h1>
          <p className="text-muted-foreground mt-2">
            Invita a miembros de tu equipo para que puedan gestionar tus unidades.
          </p>
        </div>
        <DelegadoFormModal token={session.access_token} />
      </div>

      <div className="rounded-md border mt-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email / Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendientes.length === 0 && activos.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                  No hay delegados registrados ni invitaciones pendientes.
                </TableCell>
              </TableRow>
            )}

            {pendientes.map((p: { id: string; email: string }) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.email}</TableCell>
                <TableCell>Delegado</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-yellow-600 bg-yellow-50">
                    Pendiente
                  </Badge>
                </TableCell>
              </TableRow>
            ))}

            {activos.map((a: { id: string; email: string; full_name?: string }) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {a.full_name || 'Sin nombre'} 
                </TableCell>
                <TableCell>Delegado</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-green-600 bg-green-50">
                    Activo
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
