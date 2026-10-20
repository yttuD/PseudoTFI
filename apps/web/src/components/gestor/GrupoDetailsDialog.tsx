'use client';

import { Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { GrupoItem } from './BentoGruposGrid';

interface Props {
  grupo: GrupoItem;
}

export function GrupoDetailsDialog({ grupo }: Props) {
  const t = useTranslations('Inventario');
  const hasDeposit = grupo.sena_default_activa === true;
  const rawAmount = grupo.sena_default_valor;
  const parsedAmount = rawAmount === null || rawAmount === undefined || rawAmount === ''
    ? NaN
    : Number(rawAmount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const validType = grupo.sena_default_tipo === 'porcentaje' ||
    grupo.sena_default_tipo === 'monto_fijo';

  const depositText = !hasDeposit
    ? t('grupoSinSena')
    : validAmount && validType
      ? grupo.sena_default_tipo === 'porcentaje'
        ? `${parsedAmount.toLocaleString('es-AR')} %`
        : `ARS ${parsedAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
      : t('grupoSenaNoDisponible');

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="min-h-[44px]">
            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('verDetalleGrupo')}
          </Button>
        }
      />
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="break-words">{grupo.nombre}</DialogTitle>
          <DialogDescription>{t('detalleGrupoDescripcion')}</DialogDescription>
        </DialogHeader>
        <dl className="space-y-4 text-sm">
          <div className="space-y-1">
            <dt className="font-semibold">{t('grupoDescripcion')}</dt>
            <dd className="text-muted-foreground whitespace-pre-wrap break-words">
              {grupo.descripcion?.trim() || t('grupoSinDescripcion')}
            </dd>
          </div>
          <div className="space-y-1 border-t border-border pt-4">
            <dt className="font-semibold">{t('grupoSenaPredeterminada')}</dt>
            <dd data-testid="grupo-detalle-sena" className="text-muted-foreground">{depositText}</dd>
            {hasDeposit && (
              <dd className="text-xs text-muted-foreground">{t('grupoSenaNoCobro')}</dd>
            )}
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
