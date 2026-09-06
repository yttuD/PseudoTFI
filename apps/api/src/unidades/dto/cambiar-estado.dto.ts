import { IsEnum } from 'class-validator';

export enum UnidadEstado {
  Borrador = 'borrador',
  Publicada = 'publicada',
  Pausada = 'pausada',
  NoDisponible = 'no_disponible',
  EnRevision = 'en_revision',
  Suspendida = 'suspendida',
  Archivada = 'archivada',
  BloqueadaPorImpago = 'bloqueada_por_impago',
}

export class CambiarEstadoDto {
  @IsEnum(UnidadEstado)
  estado: UnidadEstado;
}
