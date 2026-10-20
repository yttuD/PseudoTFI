import type { SeñaTipo } from './alquileres.js';

export interface GrupoSeñaConfig {
  sena_default_activa: boolean;
  sena_default_tipo: SeñaTipo;
  sena_default_valor: number;
}
