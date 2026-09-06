'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FavoritoButtonProps {
  unidadId: string;
  initialIsFavorito: boolean;
  isLoggedIn: boolean;
  token?: string;
  className?: string;
  showText?: boolean;
}

export function FavoritoButton({ 
  unidadId, 
  initialIsFavorito, 
  isLoggedIn, 
  token,
  className = '',
  showText = false
}: FavoritoButtonProps) {
  const [isFavorito, setIsFavorito] = useState(initialIsFavorito);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn || !token) {
      // Redirect to login with a callback to current path
      const loginUrl = pathname.includes('/pt') 
        ? '/pt/auth/login' 
        : pathname.includes('/en') 
          ? '/en/auth/login' 
          : '/es/auth/login';
          
      router.push(`${loginUrl}?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isLoading) return;

    // Optimistic UI update
    const previousState = isFavorito;
    setIsFavorito(!previousState);
    setIsLoading(true);

    try {
      if (!previousState) {
        // Was false, now true -> POST
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favoritos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ unidad_id: unidadId }),
        });
        
        if (!res.ok) throw new Error('Failed to add favorite');
      } else {
        // Was true, now false -> DELETE
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favoritos/${unidadId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!res.ok) throw new Error('Failed to remove favorite');
      }
      
      router.refresh();
    } catch (error) {
      console.error('Error toggling favorito:', error);
      // Revert optimistic update
      setIsFavorito(previousState);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size={showText ? "default" : "icon"}
      className={`rounded-full transition-colors ${
        isFavorito ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:text-red-600' : 'hover:bg-slate-100'
      } ${className}`}
      onClick={handleToggle}
      disabled={isLoading}
    >
      <Heart className={`h-5 w-5 ${isFavorito ? 'fill-current' : ''}`} />
      {showText && <span className="ml-2">{isFavorito ? 'Guardado' : 'Guardar'}</span>}
    </Button>
  );
}
