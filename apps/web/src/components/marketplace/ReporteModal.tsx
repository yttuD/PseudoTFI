'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ReporteModalProps {
  unidadId: string;
  isLoggedIn: boolean;
  token?: string;
  className?: string;
}

export function ReporteModal({ unidadId, isLoggedIn, token, className = '' }: ReporteModalProps) {
  const t = useTranslations('Reportes');
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [wasSent, setWasSent] = useState(false);
  const pathname = usePathname();
  // @base-ui's default Value displays the raw string ID when only item values
  // are supplied. Always present the selected option in the current locale.
  const reasonLabels: Record<string, string> = {
    fraude: t('reasonFraud'),
    falso: t('reasonFalse'),
    no_disponible: t('reasonUnavailable'),
    ofensivo: t('reasonOffensive'),
    otro: t('reasonOther'),
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/es/unidades');
    const locale = currentPath.startsWith('/pt') ? 'pt' : currentPath.startsWith('/en') ? 'en' : 'es';
    window.location.href = `/${locale}/auth/login?portal=marketplace&next=${encodeURIComponent(currentPath)}`;
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    if (nextOpen) {
      setHasError(false);
      setWasSent(false);
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo || isSubmitting || !token) return;
    setIsSubmitting(true);
    setHasError(false);
    setWasSent(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reportes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ unidad_id: unidadId, motivo }),
      });
      if (!res.ok) throw new Error('report submission failed');

      setOpen(false);
      setMotivo('');
      setWasSent(true);
    } catch {
      // Preserve the selected reason so users can retry after an API failure.
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn || !token) {
    return (
      <button
        type="button"
        className={`min-h-[44px] min-w-[44px] text-muted-foreground hover:text-red-600 inline-flex items-center text-sm font-medium px-2 py-1 rounded-lg transition-colors ${className}`}
        onClick={handleOpenClick}
      >
        <Flag className="h-4 w-4 mr-2" aria-hidden="true" />
        {t('trigger')}
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className={`min-h-[44px] min-w-[44px] text-muted-foreground hover:text-red-600 ${className}`}
            >
              <Flag className="h-4 w-4 mr-2" aria-hidden="true" />
              {t('trigger')}
            </Button>
          }
        />

        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">{t('reasonLabel')}</Label>
              <Select
                value={motivo}
                onValueChange={(val) => {
                  setMotivo(val || '');
                  setHasError(false);
                }}
                required
              >
                <SelectTrigger id="motivo" className="min-h-[44px] h-11 bg-background text-sm">
                  <SelectValue placeholder={t('reasonPlaceholder')}>{motivo ? reasonLabels[motivo] : undefined}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fraude">{t('reasonFraud')}</SelectItem>
                  <SelectItem value="falso">{t('reasonFalse')}</SelectItem>
                  <SelectItem value="no_disponible">{t('reasonUnavailable')}</SelectItem>
                  <SelectItem value="ofensivo">{t('reasonOffensive')}</SelectItem>
                  <SelectItem value="otro">{t('reasonOther')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasError && (
              <p role="alert" data-testid="report-error" className="text-sm text-destructive">
                {t('error')}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] h-11 px-4 text-sm"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                className="min-h-[44px] h-11 px-4 text-sm"
                disabled={!motivo || isSubmitting}
              >
                {isSubmitting ? t('sending') : t('submit')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {wasSent && (
        <p role="status" data-testid="report-success" className="max-w-60 text-xs text-foreground">
          {t('success')}
        </p>
      )}
    </div>
  );
}
