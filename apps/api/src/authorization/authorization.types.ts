import {
  DelegationPermission,
  DelegationScopeType,
  DelegationConfiguration,
  AccessContext,
} from '@tfi/types';

export type {
  DelegationPermission,
  DelegationScopeType,
  DelegationConfiguration,
  AccessContext,
};

export type Capability =
  | 'read_unidad'
  | 'manage_unidad'
  | 'create_unidad'
  | 'create_unidad_in_grupo'
  | 'read_grupo'
  | 'manage_grupo'
  | 'manage_grupo_membership'
  | 'read_alquiler'
  | 'manage_alquiler'
  | 'read_inquilino'
  | 'manage_inquilino'
  | 'manage_delegados'
  | 'view_logs'
  | 'view_cupo'
  | 'manage_pagos'
  | 'manage_afip';

export interface ActiveDelegationRecord {
  id: string;
  invitacion_id: string;
  gestor_id: string;
  delegado_id: string;
  estado: 'aceptada_sin_configurar' | 'activa' | 'revocada';
  permiso: DelegationPermission | null;
  alcance_tipo: DelegationScopeType | null;
  grupo_id: string | null;
  unidad_ids?: string[];
  configured_at?: string | null;
  revoked_at?: string | null;
}
