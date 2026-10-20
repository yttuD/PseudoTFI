import { createServerClient } from '@supabase/ssr';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DelegadoFormModal from './DelegadoFormModal';
import { DelegationList } from '@/components/delegados/DelegationList';
import { getServerAccessContext } from '@/lib/access-context';
import { ShieldAlert } from 'lucide-react';

interface DelegadosPageProps {
  searchParams?: {
    state?: string;
    modal?: string;
    [key: string]: string | undefined;
  };
}

export default async function DelegadosPage({ searchParams }: DelegadosPageProps) {
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
  if (!user) {
    redirect('/es/auth/login');
  }

  // Strict owner-only verification before any data fetch/render
  const accessContext = await getServerAccessContext(accessToken);
  let rol = user.user_metadata?.role || user.user_metadata?.rol || 'gestor';
  try {
    const { data: currentUser } = await supabase
      .from('users')
      .select('rol, workspace_id')
      .eq('id', user.id)
      .single();
    if (currentUser?.rol) rol = currentUser.rol;
  } catch {}

  if (accessContext?.actor === 'delegado' || rol !== 'gestor') {
    return (
      <div data-testid="owner-only-forbidden" className="p-8 max-w-2xl mx-auto my-12 text-center">
        <ShieldAlert className="w-12 h-12 mx-auto text-amber-600 mb-3" />
        <h1 className="text-2xl font-bold text-[#131F3C] dark:text-[#F5F3EE] mb-2">
          Acceso Exclusivo del Gestor
        </h1>
        <p className="text-sm text-[#667085] dark:text-[#AEB7C7]">
          La administración de colaboradores y permisos es una función reservada exclusivamente al Gestor dueño de la cuenta.
        </p>
      </div>
    );
  }

  if (searchParams?.state === 'api-error') {
    return (
      <div data-testid="delegados-api-error" className="p-8 text-center space-y-4 max-w-md mx-auto mt-12 bg-card border border-destructive/30 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-destructive">Error en Servicio de Delegados</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          No fue posible cargar el equipo de colaboradores ni las invitaciones pendientes. Por favor verifique su conexión y reintente.
        </p>
        <div className="pt-2">
          <a
            href="?state="
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Reintentar Conexión
          </a>
        </div>
      </div>
    );
  }

  // Fetch delegados lifecycle and configuration from API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3005';
  let invitaciones = [];
  let delegaciones = [];

  if (searchParams?.state !== 'empty') {
    try {
      const res = await fetch(`${apiUrl}/delegados`, {
        headers: { Authorization: `Bearer ${accessToken || ''}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json();
        invitaciones = data.invitaciones || [];
        delegaciones = data.delegaciones || [];
      }
    } catch {}
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#131F3C] dark:text-[#F5F3EE]">
            Equipo y Delegados
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#AEB7C7] mt-1">
            Asigna colaboradores a tu cuenta con alcances territoriales precisos y permisos de solo lectura o gestión operativa.
          </p>
        </div>
        <DelegadoFormModal token={accessToken || ''} initialState={searchParams?.modal || searchParams?.state} />
      </div>

      <DelegationList
        initialInvitaciones={invitaciones}
        initialDelegaciones={delegaciones}
        initialState={searchParams?.modal || searchParams?.state}
      />
    </div>
  );
}
