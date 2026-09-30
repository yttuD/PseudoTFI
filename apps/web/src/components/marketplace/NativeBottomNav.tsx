'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, MapPin, PlusCircle, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NativeBottomNav({ locale }: { locale: string }) {
  const pathname = usePathname();

  const handleHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
  };

  const navItems = [
    {
      label: 'Explorar',
      href: `/${locale}/unidades`,
      icon: Compass,
      isActive: pathname.includes('/unidades') && !pathname.includes('view=map'),
    },
    {
      label: 'Mapa',
      href: `/${locale}/unidades?view=map`,
      icon: MapPin,
      isActive: pathname.includes('view=map'),
    },
    {
      label: 'Publicar',
      href: `/${locale}/auth/registro?intent=gestor`,
      icon: PlusCircle,
      isActive: pathname.includes('/mis-unidades/nueva') || pathname.includes('/auth/registro'),
      highlight: true,
    },
    {
      label: 'Gestores',
      href: `/${locale}/auth/login?next=/${locale}/dashboard`,
      icon: Terminal,
      isActive:
        pathname.includes('/dashboard') ||
        pathname.includes('/mis-unidades') ||
        pathname.includes('/alquileres') ||
        pathname.includes('/inquilinos'),
    },
  ];

  return (
    <nav
      aria-label="Navegación Móvil Principal"
      className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-card border-t border-border px-2 flex items-center justify-around md:hidden pb-safe"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive;

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={handleHaptic}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-all duration-150 active:scale-95',
              active
                ? 'text-dorado-600 dark:text-dorado-300 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              {item.highlight ? (
                <div className="p-1 rounded-full bg-dorado-500/10 border border-dorado-500/20 text-dorado-600 dark:text-dorado-300">
                  <Icon className="h-5 w-5" />
                </div>
              ) : (
                <Icon className={cn('h-5 w-5', active ? 'text-dorado-600 dark:text-dorado-300' : 'text-muted-foreground')} />
              )}
              {active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-dorado-500" />
              )}
            </div>
            <span className={cn('mt-0.5 tracking-tight', active && 'text-dorado-600 dark:text-dorado-300 font-bold')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default NativeBottomNav;
