import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Terminal,
  ShieldAlert,
  CreditCard,
  FileCode2,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import { Skiper4ThemeToggle } from '@/components/ui/skiper4';
import { getServerAuth } from '@/lib/supabase/server-auth';

export default async function DevLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (process.env.NODE_ENV === 'production' || process.env.RENDO_BETA_MODE === 'true') notFound();
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { user } = await getServerAuth(cookieStore, supabase);

  // Si no está autenticado, redirigir al login
  if (!user) {
    redirect(`/${locale}/auth/login?role=dev`);
  }

  // Comprobar rol de Dev o Admin
  let rol = user.user_metadata?.role || user.user_metadata?.rol || '';
  try {
    const dbPromise = supabase
      .from('users')
      .select('rol')
      .eq('id', user.id)
      .single();
    const dbTimeout = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 400)
    );
    const { data: userData } = await Promise.race([dbPromise, dbTimeout]);
    if (userData?.rol) rol = userData.rol;
  } catch {}

  // Restricción de acceso estricta a la consola de devs: solo admin o dev
  const isDevAdmin =
    rol === 'admin' ||
    rol === 'dev' ||
    user.user_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'dev';

  if (!isDevAdmin) {
    return (
      <div
        data-testid="owner-only-forbidden"
        className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-mono"
      >
        <ShieldAlert className="h-12 w-12 text-rose-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Acceso Restringido</h1>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          Esta consola está reservada exclusivamente para administradores y desarrolladores autorizados de la plataforma.
        </p>
        <Link
          href={`/${locale}/dashboard`}
          className="px-4 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-lg transition-colors border border-slate-700"
        >
          Volver al Panel
        </Link>
      </div>
    );
  }

  const navItems = [
    {
      label: 'Cola de Moderación',
      href: `/${locale}/dev/moderacion`,
      icon: <ShieldAlert className="h-4 w-4" />,
      tag: 'UMBRAL >50',
    },
    {
      label: 'Auditoría de Pagos',
      href: `/${locale}/dev/auditoria-pagos`,
      icon: <CreditCard className="h-4 w-4" />,
      tag: 'TRANSF / EFVO',
    },
    {
      label: 'Logs Globales',
      href: `/${locale}/dev/logs`,
      icon: <FileCode2 className="h-4 w-4" />,
      tag: 'PLATAFORMA',
    },
    {
      label: 'Métricas & Infra',
      href: `/${locale}/dev/metricas`,
      icon: <Activity className="h-4 w-4" />,
      tag: 'LATENCIAS',
    },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-mono">
      {/* Dev Sidebar */}
      <aside className="w-full md:w-64 border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Header Brand */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Terminal className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                  RENDO OPS
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> DEV TERMINAL
                </div>
              </div>
            </div>
            <Skiper4ThemeToggle />
          </div>

          {/* Nav List */}
          <nav className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-2 mb-2">
              SISTEMA CENTRAL
            </div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors border border-transparent hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {item.tag}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="text-[10px] text-slate-400 space-y-1 px-2">
            <div className="flex items-center justify-between">
              <span>Cluster:</span>
              <span className="text-emerald-400 font-semibold">goya-node-01</span>
            </div>
            <div className="flex items-center justify-between">
              <span>DB Pool:</span>
              <span className="text-slate-300">Healthy (22ms)</span>
            </div>
          </div>

          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver a Terminal Gestor</span>
          </Link>
        </div>
      </aside>

      {/* Main Dev Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60">
        {children}
      </main>
    </div>
  );
}
