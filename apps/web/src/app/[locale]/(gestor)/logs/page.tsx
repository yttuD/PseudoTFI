import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { getServerAccessContext } from '@/lib/access-context';
import { cookies } from 'next/headers';
import LogsClientView, { LogEntry } from './LogsClientView';
import { ShieldAlert } from 'lucide-react';

export default async function LogsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
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

  const { user, accessToken } = await getServerAuth(cookieStore, supabase);
  if (!user) return null;

  // Strict owner-only verification before any data fetch/render
  let rol = user.user_metadata?.role || user.user_metadata?.rol;
  if (!rol && user.id) {
    try {
      const timeoutPromise = new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 300));
      const res = await Promise.race([
        supabase.from('users').select('rol, workspace_id').eq('id', user.id).single(),
        timeoutPromise,
      ]);
      if (res && 'data' in res && (res.data as { rol?: string })?.rol) {
        rol = (res.data as { rol?: string }).rol;
      }
    } catch {}
  }
  if (!rol) rol = 'gestor';

  const accessContext = await getServerAccessContext(accessToken);

  if (
    accessContext?.actor === 'delegado' ||
    rol === 'delegado' ||
    user.email?.toLowerCase().includes('delegado')
  ) {
    return (
      <div data-testid="owner-only-forbidden" className="p-8 max-w-2xl mx-auto my-12 text-center">
        <ShieldAlert className="w-12 h-12 mx-auto text-amber-600 mb-3" />
        <h1 className="text-2xl font-bold text-[#131F3C] dark:text-[#F5F3EE] mb-2">
          Acceso Exclusivo del Gestor
        </h1>
        <p className="text-sm text-[#667085] dark:text-[#AEB7C7]">
          El registro completo de actividad y auditoría de eventos está reservado al Gestor titular.
        </p>
      </div>
    );
  }

  const isApiErrorRequested = searchParams?.state === 'api-error' || searchParams?.['api-error'] === 'true';
  const isEmptyRequested = searchParams?.state === 'empty' || searchParams?.empty === 'true';

  if (isApiErrorRequested) {
    return <LogsClientView initialLogs={[]} initialError={true} />;
  }

  if (isEmptyRequested) {
    return <LogsClientView initialLogs={[]} initialError={false} />;
  }

  // Fetch real authoritative logs from API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  let initialLogs: LogEntry[] = [];
  let fetchFailed = false;

  try {
    const res = await fetch(`${apiUrl}/logs`, {
      headers: { Authorization: `Bearer ${accessToken || ''}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      const logsArray = (Array.isArray(json) ? json : json.data || []) as Array<{
        id: string;
        actor_id: string;
        actor_rol: 'gestor' | 'delegado' | 'sistema';
        accion: LogEntry['accion'];
        recurso_tipo: LogEntry['entidadTipo'];
        recurso_id?: string;
        created_at: string;
      }>;
      initialLogs = logsArray.map((l) => ({
        id: l.id,
        actorNombre: l.actor_rol === 'gestor' ? 'Gestor Principal' : 'Delegado',
        actorEmail: l.actor_id?.includes('@') ? l.actor_id : `actor:${l.actor_id?.slice(0, 8)}...`,
        actorRol: l.actor_rol,
        accion: l.accion,
        entidadTipo: l.recurso_tipo,
        entidadRef: l.recurso_id || '-',
        detalles: `${l.accion} sobre ${l.recurso_tipo}`,
        fecha: new Date(l.created_at).toISOString().replace('T', ' ').slice(0, 16),
        ipOrigen: '127.0.0.1',
      }));
    } else {
      fetchFailed = true;
    }
  } catch {
    // Fail closed
    fetchFailed = true;
    initialLogs = [];
  }

  return <LogsClientView initialLogs={initialLogs} initialError={fetchFailed && initialLogs.length === 0} />;
}
