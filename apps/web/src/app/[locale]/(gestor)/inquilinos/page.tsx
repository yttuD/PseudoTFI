import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { InquilinoFormModal } from '@/components/gestor/InquilinoFormModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function InquilinosPage() {
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
  let inquilinos: any[] = [];
  if (token) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inquilinos?limit=1000`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    
    if (res.ok) {
      const json = await res.json();
      inquilinos = Array.isArray(json) ? json : (json.data || []);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inquilinos</h1>
          <p className="text-muted-foreground mt-1">
            Gestioná los datos de tus inquilinos para asociarlos a los contratos.
          </p>
        </div>
        {token && <InquilinoFormModal token={token} />}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Documento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquilinos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No hay inquilinos registrados.
                </TableCell>
              </TableRow>
            ) : (
              inquilinos.map((inq) => (
                <TableRow key={inq.id}>
                  <TableCell className="font-medium">{inq.nombre_completo}</TableCell>
                  <TableCell>{inq.email || '-'}</TableCell>
                  <TableCell>{inq.telefono || '-'}</TableCell>
                  <TableCell>{inq.documento_identidad || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
