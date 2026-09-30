'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Skiper4ThemeToggle } from '@/components/ui/skiper4';
import {
  Compass,
  LayoutDashboard,
  LogIn,
  LogOut,
  Heart,
  PlusCircle,
  ChevronDown,
  Shield,
  Home
} from 'lucide-react';
import { LanguageSelector } from '@/components/marketplace/LanguageSelector';
import { getVerifiedClientSessionUser, signOutClient, type ClientAuthUser } from '@/lib/supabase/client-auth';

export function Navbar({ locale }: { locale: string }) {
  const currentLocale = useLocale();
  const tNav = useTranslations('Nav');
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<ClientAuthUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getVerifiedClientSessionUser().then((resolvedUser) => {
      if (!active) return;
      setUser(resolvedUser);
      setMounted(true);
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      active = false;
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, []);

  const changeLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    if (segments[1] === 'es' || segments[1] === 'en' || segments[1] === 'pt') {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    router.push(segments.join('/') || `/${newLocale}`);
  };

  const isGestorOrDelegado = user?.role === 'gestor' || user?.role === 'delegado';
  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 flex h-16 items-center justify-between flex-nowrap">
        <Link href={`/${locale}`} className="flex items-center gap-2 min-h-[44px] min-w-[44px] shrink-0">
          <Image
            src="/brand/rendo-logo-horizontal-light.svg"
            alt="Rendo"
            width={120}
            height={40}
            priority
            className="h-8 w-auto dark:hidden transition-opacity duration-200"
          />
          <Image
            src="/brand/rendo-logo-horizontal-dark.svg"
            alt="Rendo"
            width={120}
            height={40}
            priority
            className="h-8 w-auto hidden dark:block transition-opacity duration-200"
          />
        </Link>

        {/* Center / Navigation Links (Deliberate tablet layout: hidden until lg to preserve unclipped controls at 768px) */}
        <div className="hidden lg:flex items-center gap-4 lg:gap-6 text-xs font-semibold uppercase tracking-wider text-azul-900/85 dark:text-crema/80 shrink-0">
          <Link
            href={`/${locale}/unidades`}
            className="flex items-center gap-1.5 hover:text-azul-900 dark:hover:text-dorado-300 transition-colors font-medium min-h-[44px]"
          >
            <Compass className="h-4 w-4 text-azul-900 dark:text-dorado-300" />
            <span>{tNav('explore')}</span>
          </Link>
          <Link
            href={isGestorOrDelegado ? `/${locale}/mis-unidades/nueva` : `/${locale}/auth/registro?portal=gestor`}
            className="flex items-center hover:text-azul-900 dark:hover:text-dorado-300 transition-colors font-medium min-h-[44px]"
          >
            {tNav('publish')}
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Animated Theme Toggle */}
          <Skiper4ThemeToggle />

          {/* Selector de idioma premium */}
          <LanguageSelector
            currentLocale={currentLocale}
            onLocaleChange={changeLocale}
            ariaLabel={tNav('languageAria')}
            className="inline-block"
          />

          {mounted && user ? (
            /* User Profile Avatar Dropdown Menu */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl border border-border/80 hover:border-border bg-surface hover:bg-muted/50 transition-all text-xs font-medium min-h-[44px]"
                aria-expanded={dropdownOpen}
                aria-label="Menú de perfil"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-azul-800 to-azul-900 dark:from-dorado-600 dark:to-dorado-300 text-white dark:text-azul-900 font-bold flex items-center justify-center text-xs shadow-sm">
                  {userInitial}
                </div>
                <span className="hidden sm:inline font-semibold text-foreground max-w-[100px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-border/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Header */}
                  <div className="p-2.5 pb-3 border-b border-border/60">
                    <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary">
                      {isGestorOrDelegado ? (
                        <>
                          <Shield className="h-3 w-3" />
                          <span>{user.role === 'gestor' ? tNav('gestorPrincipal') : tNav('delegado')}</span>
                        </>
                      ) : (
                        <>
                          <Home className="h-3 w-3" />
                          <span>Inquilino</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Menu Options */}
                  <div className="py-1 space-y-1">
                    <Link
                      href={`/${locale}/favoritos`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-muted/70 text-foreground transition-colors"
                    >
                      <Heart className="h-4 w-4 text-rose-500" />
                      <span>{tNav('favorites')}</span>
                    </Link>

                    {isGestorOrDelegado ? (
                      <Link
                        href={`/${locale}/dashboard`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl bg-dorado-500/15 hover:bg-dorado-500/25 text-dorado-700 dark:text-dorado-400 border border-dorado-500/30 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4 text-dorado-600 dark:text-dorado-400" />
                        <span>{tNav('goToDashboard')}</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/${locale}/auth/onboarding-gestor`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-muted/70 text-foreground transition-colors"
                      >
                        <PlusCircle className="h-4 w-4 text-primary" />
                        <span>{tNav('publishUnit')}</span>
                      </Link>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="pt-1 border-t border-border/60">
                    <button
                      type="button"
                      onClick={async () => {
                        setDropdownOpen(false);
                        await signOutClient();
                        window.location.href = `/${locale}`;
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{tNav('logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated actions */
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/auth/login?portal=marketplace`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-azul-900/85 dark:text-crema/80 hover:text-azul-900 dark:hover:text-dorado-300 hover:bg-muted/60 transition-all"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{tNav('login')}</span>
              </Link>

              <Link
                href={`/${locale}/auth/login?portal=gestor&next=/${locale}/dashboard`}
                className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-dorado-500 hover:bg-dorado-600 text-azul-900 text-xs font-semibold shadow-sm transition-all"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tNav('dashboard')}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
