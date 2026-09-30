export type DelegationPermission = 'ver' | 'gestionar';

export type DelegationScopeType = 'cuenta' | 'grupo' | 'unidades';

export type InvitationState =
  | 'pendiente'
  | 'aceptada'
  | 'rechazada'
  | 'cancelada'
  | 'expirada';

export type DelegationState =
  | 'aceptada_sin_configurar'
  | 'activa'
  | 'revocada';

export type DelegationConfiguration =
  | {
      permiso: DelegationPermission;
      alcanceTipo: 'cuenta';
    }
  | {
      permiso: DelegationPermission;
      alcanceTipo: 'grupo';
      grupoId: string;
    }
  | {
      permiso: DelegationPermission;
      alcanceTipo: 'unidades';
      unidadIds: string[];
    };

export type AccessContext =
  | {
      actor: 'gestor';
      ownerOnly: true;
      capabilities: string[];
    }
  | {
      actor: 'delegado';
      state: 'pendiente_configuracion';
      ownerOnly: false;
      capabilities: string[];
    }
  | {
      actor: 'delegado';
      state: 'activo';
      ownerOnly: false;
      permiso: DelegationPermission;
      scope: DelegationConfiguration;
      capabilities: string[];
    };

export interface InvitationChannelStatus {
  inApp: 'created' | 'read';
  email: 'pending' | 'sent' | 'failed';
}

export interface DelegadoInvitation {
  id: string;
  target: {
    displayName: string;
    maskedEmail: string;
  };
  estado: InvitationState;
  expiresAt: string;
  channels: InvitationChannelStatus;
  createdAt: string;
}

export interface ReceivedInvitation {
  id: string;
  gestorDisplayName: string;
  estado: 'pendiente' | 'expirada';
  expiresAt: string;
  createdAt: string;
}

export interface DelegationSummary {
  id: string;
  delegado: {
    id: string;
    displayName: string;
    maskedEmail: string;
  };
  estado: DelegationState;
  permiso: DelegationPermission | null;
  alcanceTipo: DelegationScopeType | null;
  grupo?: {
    id: string;
    nombre: string;
  } | null;
  unidades?: Array<{
    id: string;
    nombre: string;
  }>;
  updatedAt: string;
}
