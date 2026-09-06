import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GrupoFormModal } from '@/components/gestor/GrupoFormModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function GruposPage() {
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
  let grupos: any[] = [];
  if (token) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/grupos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    
    if (res.ok) {
      const json = await res.json();
      // Si el backend devuelve { data: [...] } usamos json.data
      // Si devuelve directamente el array [...], usamos json
      grupos = Array.isArray(json) ? json : (json.data || []);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grupos</h1>
          <p className="text-muted-foreground mt-1">
            Organizá tus unidades en grupos o edificios.
          </p>
        </div>
        {token && <GrupoFormModal token={token} />}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Grupo</TableHead>
              <TableHead>Fecha de Creación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No hay grupos registrados.
                </TableCell>
              </TableRow>
            ) : (
              grupos.map((grupo) => (
                <TableRow key={grupo.id}>
                  <TableCell className="font-medium">{grupo.nombre}</TableCell>
                  <TableCell>{new Date(grupo.creado_en || Date.now()).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
