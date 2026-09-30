import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Sidebar from '@/components/gestor/Sidebar';
import { FloatingDock } from '@/components/ui/floating-dock';
import { PlusCircle, Users, FileText, AlertTriangle, Eye } from 'lucide-react';
import { getServerAuth } from '@/lib/supabase/server-auth';
import { getServerAccessContext } from '@/lib/access-context';

export default async function GestorLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const cookieStore = cookies();
  const tNav = await getTranslations('Nav');

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

  const { user, accessToken } = await getServerAuth(cookieStore, supabase);

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const accessContext = await getServerAccessContext(accessToken);

  // Fail-closed operational layout: If accessContext cannot be resolved, block access for every actor
  if (!accessContext) {
    const { data: publicProfile } = await supabase.from('users')
      .select('rol').eq('id', user.id).maybeSingle();
    if (publicProfile?.rol === 'buscador') {
      redirect(`/${locale}/auth/onboarding-gestor`);
    }
    return (
      <div
        data-testid="access-context-error"
        className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center font-sans"
      >
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Error de Sincronización de Acceso</h1>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          No pudimos verificar tus permisos con el servicio de autorización. Por seguridad, el acceso ha sido bloqueado temporalmente.
        </p>
        <a
          href={`/${locale}/dashboard`}
          className="px-4 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </a>
      </div>
    );
  }

  const rol = accessContext.actor === 'delegado' ? 'delegado' : 'gestor';

  const isDelegado = accessContext?.actor === 'delegado' || rol === 'delegado';
  const isPendingDelegado = accessContext?.actor === 'delegado' && accessContext.state === 'pendiente_configuracion';
  const isReadOnlyDelegado = accessContext?.actor === 'delegado' && accessContext.state === 'activo' && accessContext.permiso === 'ver';

  const gestorQuickActions = [
    {
      title: tNav('quickNewUnit'),
      icon: <PlusCircle className="h-5 w-5" />,
      href: `/${locale}/mis-unidades/nueva`,
    },
    {
      title: tNav('quickNewTenant'),
      icon: <Users className="h-5 w-5" />,
      href: `/${locale}/inquilinos`,
    },
    {
      title: tNav('quickNewRental'),
      icon: <FileText className="h-5 w-5" />,
      href: `/${locale}/alquileres`,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background relative">
      <Sidebar locale={locale} rol={rol} accessContext={accessContext} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/10 relative">
        {isPendingDelegado ? (
          <div className="space-y-6">
            <div
              data-testid="banner-pendiente-configuracion"
              className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200 font-sans text-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-semibold text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 mr-2">
                    Acceso Pendiente
                  </span>
                  <span>
                    Tu invitación fue aceptada pero el Gestor titular aún no configuró tus permisos. No tienes unidades asignadas.
                  </span>
                </div>
              </div>
            </div>

            <div
              data-testid="pending-configuration-state"
              className="rounded-2xl border border-border bg-card p-8 text-center max-w-xl mx-auto mt-12 shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Configuración de Alcance Pendiente</h2>
              <p className="text-sm text-muted-foreground mb-4">
                El Gestor titular debe asignarte un permiso (Ver o Gestionar) y un alcance (Cuenta, Grupo o Unidades) antes de que puedas acceder a la operativa del espacio.
              </p>
              <p className="text-xs text-muted-foreground/80">
                Por razones de seguridad, ninguna información privada es accesible hasta que la delegación sea configurada.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Informational banner for Delegado in Ver mode */}
            {isReadOnlyDelegado && (
              <div
                data-testid="banner-solo-lectura"
                className="mb-6 rounded-xl border border-border/80 bg-surface px-4 py-2.5 text-muted-foreground font-sans text-xs flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#B89355] shrink-0" />
                  <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">
                    Modo Solo Lectura
                  </span>
                  <span>
                    Tienes permiso de lectura sobre las unidades asignadas por el Gestor titular. Las acciones de modificación están deshabilitadas.
                  </span>
                </div>
              </div>
            )}

            {children}

            {/* Desktop Quick-Action Floating Dock - Only for Gestor */}
            {!isDelegado && (
              <div className="fixed bottom-6 right-8 z-30 hidden md:block">
                <FloatingDock items={gestorQuickActions} mobileAriaLabel={tNav('toggleMenuAria')} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
