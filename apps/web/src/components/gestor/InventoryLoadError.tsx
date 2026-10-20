'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface InventoryLoadErrorProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
}

export function InventoryLoadError({
  title,
  message,
  retryLabel,
  onRetry,
}: InventoryLoadErrorProps) {
  const t = useTranslations('Inventario');

  const resolvedTitle = title || t('errorCargaTitulo');
  const resolvedMessage = message || t('errorCargaMensaje');
  const resolvedRetryLabel = retryLabel || t('reintentar');

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-foreground shadow-sm dark:border-destructive/50 dark:bg-destructive/15"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-destructive/20 text-destructive shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-foreground">
              {resolvedTitle}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {resolvedMessage}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleRetry}
          className="min-h-[44px] min-w-[44px] shrink-0 font-mono text-xs uppercase tracking-wider inline-flex items-center gap-2 border-border/80 hover:bg-background/80"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {resolvedRetryLabel}
        </Button>
      </div>
    </div>
  );
}
