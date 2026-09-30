import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { getServerAccessContext } from '@/lib/access-context';
import { cookies } from 'next/headers';
import { InquilinoFormModal } from '@/components/gestor/InquilinoFormModal';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
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

  const { accessToken: token } = await getServerAuth(cookieStore, supabase);
  const accessContext = await getServerAccessContext(token);

  const isDelegado = accessContext?.actor === 'delegado';
  const isReadOnly = isDelegado && (accessContext.state !== 'activo' || accessContext.permiso === 'ver');

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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Inquilinos</h1>
            {isReadOnly && (
              <Badge data-testid="readonly-badge" variant="outline" className="border-[#B89355] text-[#B89355] font-mono text-xs flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Modo Solo Lectura
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Gestioná los datos de tus inquilinos para asociarlos a los contratos.
          </p>
        </div>
        {token && !isReadOnly && <InquilinoFormModal token={token} />}
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        {inquilinos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-sm">
            No hay inquilinos registrados.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                  {inquilinos.map((inq) => (
                    <TableRow key={inq.id}>
                      <TableCell className="font-medium">{inq.nombre_completo}</TableCell>
                      <TableCell>{inq.email || '-'}</TableCell>
                      <TableCell>{inq.telefono || '-'}</TableCell>
                      <TableCell>{inq.documento_identidad || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-border">
              {inquilinos.map((inq) => (
                <div key={inq.id} className="p-4 space-y-1">
                  <h4 className="font-semibold text-sm">{inq.nombre_completo}</h4>
                  <div className="text-xs text-muted-foreground space-y-0.5 font-mono">
                    {inq.email && <div>Email: {inq.email}</div>}
                    {inq.telefono && <div>Tel: {inq.telefono}</div>}
                    {inq.documento_identidad && <div>Doc: {inq.documento_identidad}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
