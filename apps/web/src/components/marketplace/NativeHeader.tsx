'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search } from 'lucide-react';
import { Skiper4ThemeToggle } from '@/components/ui/skiper4';

import { LanguageSelector } from '@/components/marketplace/LanguageSelector';

export function NativeHeader({ locale }: { locale: string }) {
  const router = useRouter();

  const handleHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-xl border-b border-border/70 px-4 py-2.5 pt-safe flex items-center justify-between gap-2 md:hidden">
      {/* Location Badge */}
      <div 
        onClick={handleHaptic}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-foreground text-xs font-medium shrink-0 shadow-2xs"
      >
        <MapPin className="h-3.5 w-3.5 text-dorado-600 dark:text-dorado-300 animate-pulse" />
        <span className="font-semibold tracking-tight">📍 Goya, Ctes</span>
      </div>

      {/* Quick Touch Search Bar */}
      <div 
        onClick={() => {
          handleHaptic();
          router.push(`/${locale}/unidades`);
        }}
        className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 border border-border/60 text-muted-foreground text-xs cursor-pointer active:scale-98 transition-transform"
      >
        <Search className="h-3.5 w-3.5 text-dorado-600 dark:text-dorado-300 shrink-0" />
        <span className="truncate">Buscar departamentos, casas...</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <LanguageSelector currentLocale={locale} />
        <Skiper4ThemeToggle />
      </div>
    </header>
  );
}

export default NativeHeader;
