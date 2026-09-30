'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';
import { Skiper99AnimatedIcon } from '@/components/ui/skiper99';
import { cn } from '@/lib/utils';
import { getClientSessionToken, getClientSessionUser } from '@/lib/supabase/client-auth';
import { createClient } from '@/lib/supabase/client';

interface FavoritoButtonProps {
  unidadId: string;
  initialIsFavorito?: boolean;
  initialFavorito?: boolean;
  isLoggedIn?: boolean;
  token?: string;
  className?: string;
  showText?: boolean;
}

export function FavoritoButton({
  unidadId,
  initialIsFavorito,
  initialFavorito,
  isLoggedIn,
  token,
  className = '',
  showText = false,
}: FavoritoButtonProps) {
  const initial = initialFavorito ?? initialIsFavorito ?? false;
  const [isFavorito, setIsFavorito] = useState(initial);
  const [isLoading, setIsLoading] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsFavorito(initialFavorito ?? initialIsFavorito ?? false);
  }, [initialFavorito, initialIsFavorito]);

  const handleToggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const clientUser = getClientSessionUser();
    let effectiveToken = token || getClientSessionToken();
    if (!effectiveToken) {
      const { data } = await createClient().auth.getSession();
      effectiveToken = data.session?.access_token || null;
    }
    const effectiveIsLoggedIn = isLoggedIn || !!clientUser || !!effectiveToken;

    if (!effectiveIsLoggedIn || !effectiveToken) {
      const locale = pathname.startsWith('/pt') ? 'pt' : pathname.startsWith('/en') ? 'en' : 'es';
      window.location.href = `/${locale}/auth/login?portal=marketplace&next=${encodeURIComponent(pathname)}`;
      return;
    }

    if (isLoading) return;

    const previousState = isFavorito;
    const nextState = !previousState;
    // 1. Optimistic UI update immediately
    setIsFavorito(nextState);
    setIsLoading(true);
    setErrorToast(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      if (nextState) {
        const res = await fetch(`${apiUrl}/favoritos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${effectiveToken}`,
          },
          body: JSON.stringify({ unidad_id: unidadId }),
        });

        if (!res.ok) throw new Error('Error al guardar en favoritos');
      } else {
        const res = await fetch(`${apiUrl}/favoritos/${unidadId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
          },
        });

        if (!res.ok) throw new Error('Error al quitar de favoritos');
      }

      router.refresh();
    } catch (error) {
      console.error('Error toggling favorito:', error);
      // Revert optimistic state
      setIsFavorito(previousState);
      setErrorToast('No se pudo actualizar favoritos');
      setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <Skiper99AnimatedIcon
        icon={Heart}
        animation="pulse"
        active={isFavorito}
        iconSize={18}
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={isFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        iconClassName={cn(
          isFavorito ? 'fill-red-500 text-red-500' : 'text-foreground/80 hover:text-red-500'
        )}
        className={cn(
          'rounded-full bg-background/80 backdrop-blur-md border border-border/60 shadow-sm transition-all hover:bg-background cursor-pointer',
          isFavorito && 'bg-red-50/90 border-red-200 dark:bg-red-950/30 dark:border-red-800/40',
          className
        )}
      >
        {showText && <span>{isFavorito ? 'Guardado' : 'Guardar'}</span>}
      </Skiper99AnimatedIcon>
      {errorToast && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[11px] font-medium text-white bg-destructive/90 rounded-lg shadow-lg whitespace-nowrap pointer-events-none z-50 animate-in fade-in zoom-in duration-150">
          {errorToast}
        </span>
      )}
    </div>
  );
}
