'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  UserCheck,
  CreditCard,
  ReceiptText,
  Compass,
  History,
  BarChart3,
  Sun,
  Moon,
} from 'lucide-react';
import { AccessContext } from '@tfi/types';
import {
  Sidebar as AceternitySidebar,
  SidebarBody,
  SidebarLink,
} from '@/components/ui/sidebar';

export default function Sidebar({
  locale,
  rol = 'gestor',
  accessContext,
}: {
  locale: string;
  rol?: string;
  accessContext?: AccessContext | null;
}) {
  const tNav = useTranslations('Nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const navigation = [
    { label: tNav('dashboard'), href: `/${locale}/dashboard`, icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Métricas', href: `/${locale}/metricas`, icon: <BarChart3 className="h-5 w-5" />, reqGestor: true },
    { label: tNav('units'), href: `/${locale}/mis-unidades`, icon: <Building2 className="h-5 w-5" /> },
    { label: tNav('tenants'), href: `/${locale}/inquilinos`, icon: <Users className="h-5 w-5" /> },
    { label: tNav('rentals'), href: `/${locale}/alquileres`, icon: <FileText className="h-5 w-5" /> },
    { label: tNav('billing'), href: `/${locale}/facturacion`, icon: <CreditCard className="h-5 w-5" />, reqGestor: true },
    { label: 'Facturación AFIP', href: `/${locale}/facturacion-afip`, icon: <ReceiptText className="h-5 w-5" />, reqGestor: true },
    { label: tNav('delegates'), href: `/${locale}/delegados`, icon: <UserCheck className="h-5 w-5" />, reqGestor: true },
    { label: tNav('activityLog') || 'Registro de Actividad', href: `/${locale}/logs`, icon: <History className="h-5 w-5" />, reqGestor: true },
  ];

  const isDelegado = accessContext?.actor === 'delegado' || rol === 'delegado';
  const delegadoActivo = accessContext?.actor === 'delegado' && accessContext.state === 'activo' ? accessContext : null;
  const isPending = accessContext?.actor === 'delegado' && accessContext.state === 'pendiente_configuracion';
  const visibleNav = navigation.filter((n) => !n.reqGestor || !isDelegado);

  return (
    <AceternitySidebar open={open} setOpen={setOpen} animate={true}>
      <SidebarBody className="justify-between gap-6 border-r border-border bg-surface select-none">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Logo Header */}
          <div className="flex items-center justify-between py-2 px-1 mb-4">
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 min-h-[44px] min-w-[44px]">
              <div className="h-8 w-8 rounded-xl bg-transparent flex items-center justify-center shrink-0">
                <Image
                  src="/brand/rendo-mark-light.svg"
                  alt="Rendo"
                  width={32}
                  height={32}
                  className="h-7 w-auto dark:hidden object-contain"
                />
                <Image
                  src="/brand/rendo-mark-dark.svg"
                  alt="Rendo"
                  width={32}
                  height={32}
                  className="h-7 w-auto hidden dark:block object-contain"
                />
              </div>
              {open && (
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight text-foreground font-mono">
                    {tNav('terminalHeader')}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {!isDelegado ? tNav('gestorPrincipal') : tNav('delegado')}
                    </span>
                    {delegadoActivo?.permiso === 'ver' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono uppercase">
                        Ver
                      </span>
                    )}
                    {delegadoActivo?.permiso === 'gestionar' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#B89355]/20 text-[#B89355] font-mono uppercase font-semibold">
                        Gestionar
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono uppercase">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1">
            {visibleNav.map((link) => (
              <SidebarLink
                key={link.href}
                link={link}
                active={isActive(link.href)}
                className="font-mono text-xs uppercase"
              />
            ))}
          </div>
        </div>

        {/* Footer info in sidebar */}
        <div className="border-t border-border pt-3 flex flex-col gap-1">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            title={mounted && (resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro') || 'Cambiar tema'}
            aria-label="Cambiar tema"
            className="flex items-center gap-3 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors text-xs font-mono w-full text-left cursor-pointer min-h-[44px] min-w-[44px]"
          >
            <div className="h-4 w-4 shrink-0 flex items-center justify-center">
              {mounted ? (
                resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4 text-dorado-500 transition-transform rotate-0 scale-100" />
                ) : (
                  <Moon className="h-4 w-4 text-azul-700 dark:text-azul-300 transition-transform rotate-0 scale-100" />
                )
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {open && (
              <span className="truncate">
                {mounted ? (resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Oscuro') : 'Cambiar tema'}
              </span>
            )}
          </button>

          <Link
            href={`/${locale}`}
            title="Explorar catálogo público en Marketplace"
            className="flex items-center gap-3 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors text-xs font-mono min-h-[44px] min-w-[44px]"
          >
            <Compass className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground" />
            {open && <span>{tNav('backToMarketplace')}</span>}
          </Link>
        </div>
      </SidebarBody>
    </AceternitySidebar>
  );
}
