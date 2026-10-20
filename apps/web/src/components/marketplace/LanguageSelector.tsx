'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { publicSpring } from '@/lib/motion-config';

interface Language {
  code: 'es' | 'en' | 'pt';
  label: string;
  nativeName: string;
}

const LANGUAGES: Language[] = [
  { code: 'es', label: 'ES', nativeName: 'Español' },
  { code: 'en', label: 'EN', nativeName: 'English' },
  { code: 'pt', label: 'PT', nativeName: 'Português' },
];

interface LanguageSelectorProps {
  currentLocale: string;
  onLocaleChange?: (locale: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function LanguageSelector({
  currentLocale,
  onLocaleChange,
  ariaLabel = 'Cambiar idioma',
  className,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const activeLang = LANGUAGES.find((l) => l.code === currentLocale) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const getLocaleHref = (targetLocale: string) => {
    const segments = pathname.split('/');
    if (segments[1] === 'es' || segments[1] === 'en' || segments[1] === 'pt') {
      segments[1] = targetLocale;
    } else {
      segments.splice(1, 0, targetLocale);
    }
    return segments.join('/') || `/${targetLocale}`;
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* Botón disparador píldora premium */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold min-h-[44px]',
          'bg-surface/90 hover:bg-surface border border-border/80 text-foreground',
          'shadow-sm hover:shadow-glass transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
        )}
      >
        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-mono uppercase tracking-wider text-[11px] font-bold">
          {activeLang.label}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDown className="h-3 w-3" />
        </motion.div>
      </button>

      {/* Menú desplegable flotante con Glassmorphism */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={publicSpring}
            role="listbox"
            aria-label={ariaLabel}
            className={cn(
              'absolute right-0 mt-2 w-44 origin-top-right rounded-2xl p-1.5 z-50',
              'bg-card text-card-foreground border border-border shadow-2xl opacity-100',
              'focus:outline-none'
            )}
          >
            <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border/50 mb-1">
              {ariaLabel}
            </div>

            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLocale;
              return (
                <Link
                  key={lang.code}
                  href={getLocaleHref(lang.code)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setIsOpen(false);
                    onLocaleChange?.(lang.code);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                    'text-foreground hover:bg-dorado-50 dark:hover:bg-azul-700 focus:outline-none',
                    isSelected && 'bg-dorado-100 text-dorado-800 dark:bg-azul-600 dark:text-dorado-100 font-semibold'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-mono text-[11px] font-bold uppercase w-5",
                      isSelected ? "text-dorado-700 dark:text-dorado-200" : "text-muted-foreground"
                    )}>
                      {lang.label}
                    </span>
                    <span>{lang.nativeName}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-dorado-700 dark:text-dorado-200 shrink-0" />
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LanguageSelector;
