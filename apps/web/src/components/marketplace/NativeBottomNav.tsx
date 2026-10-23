'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Heart, PlusCircle, Terminal, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';


export function NativeBottomNav({ locale }: { locale: string }) {
  const pathname = usePathname();
  const tNav = useTranslations('Nav');
  const [managerAccess, setManagerAccess] = useState(false);
  useEffect(() => {
    // Navbar already validates the session; reuse its event instead of
    // requesting Auth + profile again for a second mobile-only component.
    const handleRole = (event: Event) => {
      const role = (event as CustomEvent<{ role: string | null }>).detail?.role;
      setManagerAccess(role === 'gestor' || role === 'delegado');
    };
    window.addEventListener('rendo:verified-nav-role', handleRole);
    return () => window.removeEventListener('rendo:verified-nav-role', handleRole);
  }, []);

  const navItems = [
    {
      label: tNav('mobileExplore'),
      href: `/${locale}/unidades`,
      icon: Compass,
      isActive: pathname === `/${locale}/unidades` || pathname.startsWith(`/${locale}/unidades/`),
    },
    {
      label: tNav('mobileFavorites'),
      href: `/${locale}/favoritos`,
      icon: Heart,
      isActive: pathname === `/${locale}/favoritos`,
    },
    {
      label: tNav('mobilePublish'),
      href: managerAccess ? `/${locale}/mis-unidades/nueva` : `/${locale}/auth/registro?portal=gestor`,
      icon: PlusCircle,
      isActive: pathname.includes('/mis-unidades/nueva') || pathname.includes('/auth/registro'),
      highlight: true,
    },
    {
      label: tNav('mobileManagers'),
      href: managerAccess ? `/${locale}/dashboard` : `/${locale}/auth/login?portal=gestor&next=/${locale}/dashboard`,
      icon: Terminal,
      isActive:
        pathname.includes('/dashboard') ||
        pathname.includes('/mis-unidades') ||
        pathname.includes('/alquileres') ||
        pathname.includes('/inquilinos'),
    },
    {
      label: tNav('mobileAccount'),
      href: `/${locale}/cuenta`,
      icon: UserRound,
      isActive: pathname.includes('/cuenta'),
    },
  ];

  return (
    <nav
      aria-label={tNav('mobileNavigation')}
      className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-card border-t border-border px-2 flex items-center justify-around md:hidden pb-safe"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive;

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              active
                ? 'text-dorado-700 dark:text-dorado-300 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              {item.highlight ? (
                <div className="p-1 rounded-full bg-dorado-500/10 border border-dorado-500/20 text-dorado-700 dark:text-dorado-300">
                  <Icon className="h-5 w-5" />
                </div>
              ) : (
                <Icon className={cn('h-5 w-5', active ? 'text-dorado-700 dark:text-dorado-300' : 'text-muted-foreground')} />
              )}
              {active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-dorado-500" />
              )}
            </div>
            <span className={cn('mt-0.5 tracking-tight', active && 'text-dorado-700 dark:text-dorado-300 font-bold')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default NativeBottomNav;
