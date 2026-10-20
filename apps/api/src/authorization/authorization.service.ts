import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AuthenticatedUser } from '../auth/supabase-auth.guard.js';
import {
  AccessContext,
  ActiveDelegationRecord,
  Capability,
  DelegationConfiguration,
} from './authorization.types.js';

@Injectable()
export class AuthorizationService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Asserts that the actor is the exact Gestor owner of the workspace.
   * Delegados are strictly forbidden from owner-only capabilities.
   */
  assertOwnerOnly(actor: AuthenticatedUser, targetGestorId?: string): void {
    if (actor.rol !== 'gestor') {
      throw new ForbiddenException(
        'Acceso restringido: Esta funcionalidad es exclusiva del Gestor dueño',
      );
    }
    if (targetGestorId && actor.id !== targetGestorId) {
      throw new ForbiddenException(
        'Aislamiento Multi-Tenant: No tienes permisos sobre este workspace',
      );
    }
  }

  /**
   * Resolves the complete active AccessContext for the current actor.
   */
  async resolveAccessContext(actor: AuthenticatedUser): Promise<AccessContext> {
    if (actor.rol === 'gestor') {
      const capabilities: Capability[] = [
        'read_unidad',
        'manage_unidad',
        'create_unidad',
        'create_unidad_in_grupo',
        'read_grupo',
        'manage_grupo',
        'manage_grupo_membership',
        'read_alquiler',
        'manage_alquiler',
        'read_inquilino',
        'manage_inquilino',
        'manage_delegados',
        'view_logs',
        'view_cupo',
        'manage_pagos',
        'manage_afip',
      ];
      return {
        actor: 'gestor',
        ownerOnly: true,
        capabilities,
      };
    }

    if (actor.rol !== 'delegado') {
      throw new ForbiddenException('Rol de usuario no autorizado');
    }

    const delegation = await this.getActiveDelegation(actor.id, actor.workspace_id);

    if (!delegation || delegation.estado === 'aceptada_sin_configurar' || delegation.estado === 'revocada') {
      return {
        actor: 'delegado',
        state: 'pendiente_configuracion',
        ownerOnly: false,
        capabilities: [],
      };
    }

    let scopeConfig: DelegationConfiguration;
    const permiso = delegation.permiso!;

    if (delegation.alcance_tipo === 'cuenta') {
      scopeConfig = { permiso, alcanceTipo: 'cuenta' };
    } else if (delegation.alcance_tipo === 'grupo') {
      scopeConfig = {
        permiso,
        alcanceTipo: 'grupo',
        grupoId: delegation.grupo_id!,
      };
    } else {
      scopeConfig = {
        permiso,
        alcanceTipo: 'unidades',
        unidadIds: delegation.unidad_ids || [],
      };
    }

    const capabilities: Capability[] = ['read_unidad', 'read_grupo', 'read_alquiler', 'read_inquilino'];

    if (permiso === 'gestionar') {
      capabilities.push('manage_unidad', 'manage_alquiler', 'manage_inquilino');
      if (delegation.alcance_tipo === 'cuenta') {
        capabilities.push('create_unidad', 'manage_grupo', 'manage_grupo_membership');
      } else if (delegation.alcance_tipo === 'grupo') {
        capabilities.push('create_unidad_in_grupo', 'manage_grupo');
      }
    }

    return {
      actor: 'delegado',
      state: 'activo',
      ownerOnly: false,
      permiso,
      scope: scopeConfig,
      capabilities,
    };
  }

  /**
   * Retrieves the active delegation record for a delegado in a given gestor workspace.
   */
  async getActiveDelegation(
    delegadoId: string,
    gestorId: string,
  ): Promise<ActiveDelegationRecord | null> {
    try {
      const client = this.supabaseService.getAdminClient();
      const { data, error } = await client
        .from('delegaciones')
        .select('*')
        .eq('delegado_id', delegadoId)
        .eq('gestor_id', gestorId)
        .neq('estado', 'revocada')
        .single();

      if (error || !data) {
        return null;
      }

      const record: ActiveDelegationRecord = {
        id: data.id,
        invitacion_id: data.invitacion_id,
        gestor_id: data.gestor_id,
        delegado_id: data.delegado_id,
        estado: data.estado,
        permiso: data.permiso,
        alcance_tipo: data.alcance_tipo,
        grupo_id: data.grupo_id,
        configured_at: data.configured_at,
        revoked_at: data.revoked_at,
      };

      if (data.alcance_tipo === 'unidades') {
        const { data: units } = await client
          .from('delegacion_unidades')
          .select('unidad_id')
          .eq('delegacion_id', data.id);
        record.unidad_ids = units ? units.map((u: any) => u.unidad_id) : [];
      }

      return record;
    } catch {
      return null;
    }
  }

  async canReadUnidad(actor: AuthenticatedUser, unidadId: string): Promise<boolean> {
    if (actor.rol === 'gestor') {
      const client = this.supabaseService.getAdminClient();
      const { data } = await client
        .from('unidades')
        .select('id, gestor_id, deleted_at')
        .eq('id', unidadId)
        .single();
      return !!data && data.gestor_id === actor.id && !data.deleted_at;
    }

    const delegation = await this.getActiveDelegation(actor.id, actor.workspace_id);
    if (!delegation || delegation.estado !== 'activa') {
      return false;
    }

    const client = this.supabaseService.getAdminClient();
    const { data: unidad } = await client
      .from('unidades')
      .select('id, gestor_id, grupo_id, deleted_at')
      .eq('id', unidadId)
      .single();

    if (!unidad || unidad.deleted_at || unidad.gestor_id !== actor.workspace_id) {
      return false;
    }

    if (delegation.alcance_tipo === 'cuenta') {
      return true;
    }
    if (delegation.alcance_tipo === 'grupo') {
      return !!unidad.grupo_id && unidad.grupo_id === delegation.grupo_id;
    }
    if (delegation.alcance_tipo === 'unidades') {
      return (delegation.unidad_ids || []).includes(unidadId);
    }

    return false;
  }

  async canManageUnidad(actor: AuthenticatedUser, unidadId: string): Promise<boolean> {
    if (actor.rol === 'gestor') {
      return this.canReadUnidad(actor, unidadId);
    }

    const delegation = await this.getActiveDelegation(actor.id, actor.workspace_id);
    if (!delegation || delegation.estado !== 'activa' || delegation.permiso !== 'gestionar') {
      return false;
    }

    return this.canReadUnidad(actor, unidadId);
  }

  async canCreateUnidad(
    actor: AuthenticatedUser,
    targetGestorId: string,
    targetGrupoId?: string | null,
  ): Promise<boolean> {
    if (actor.rol === 'gestor') {
      return actor.id === targetGestorId;
    }

    if (actor.workspace_id !== targetGestorId) {
      return false;
    }

    const delegation = await this.getActiveDelegation(actor.id, actor.workspace_id);
    if (!delegation || delegation.estado !== 'activa' || delegation.permiso !== 'gestionar') {
      return false;
    }

    if (delegation.alcance_tipo === 'cuenta') {
      return true;
    }
    if (delegation.alcance_tipo === 'grupo') {
      return !!targetGrupoId && targetGrupoId === delegation.grupo_id;
    }

    return false;
  }

  async canReadGrupo(actor: AuthenticatedUser, grupoId: string): Promise<boolean> {
    const client = this.supabaseService.getAdminClient();
    const { data: grupo } = await client
      .from('grupos')
      .select('id, gestor_id, deleted_at')
      .eq('id', grupoId)
      .single();

    if (!grupo || grupo.deleted_at) {
      return false;
    }

    if (actor.rol === 'gestor') {
      return grupo.gestor_id === actor.id;
    }

    if (grupo.gestor_id !== actor.workspace_id) {
      return false;
    }

    const delegation = await this.getActiveDelegation(actor.id, actor.workspace_id);
    if (!delegation || delegation.estado !== 'activa') {
      return false;
    }

    if (delegation.alcance_tipo === 'cuenta') {
      return true;
    }
    if (delegation.alcance_tipo === 'grupo') {
      return delegation.grupo_id === grupoId;
    }
    if (delegation.alcance_tipo === 'unidades') {
      // Readable only if it contains at least one of the delegated units
      const { data: units } = await client
        .from('unidades')
        .select('id')
        .eq('grupo_id', grupoId)
        .is('deleted_at', null)
        .in('id', delegation.unidad_ids || []);
      return !!units && units.length > 0;
    }

    return false;
  }

  async canManageGrupo(actor: AuthenticatedUser, grupoId: string): Promise<boolean> {
    if (actor.rol === 'gestor') {
      return this.canReadGrupo(actor, grupoId);
    }

    const delegation = await this.getActiveDelegation(actor.id, actor.workspace_id);
    if (!delegation || delegation.estado !== 'activa' || delegation.permiso !== 'gestionar') {
      return false;
    }

    if (delegation.alcance_tipo === 'cuenta') {
      return this.canReadGrupo(actor, grupoId);
    }
    if (delegation.alcance_tipo === 'grupo') {
      return delegation.grupo_id === grupoId;
    }

    return false;
  }

  async canManageGrupoMembership(actor: AuthenticatedUser, grupoId: string): Promise<boolean> {
    if (actor.rol === 'gestor') {
      return this.canReadGrupo(actor, grupoId);
    }

    const delegation = await this.getActiveDelegation(actor.id, actor.workspace_id);
    if (!delegation || delegation.estado !== 'activa' || delegation.permiso !== 'gestionar') {
      return false;
    }

    // Only account-wide Gestionar can manage membership or delete group
    return delegation.alcance_tipo === 'cuenta' && this.canReadGrupo(actor, grupoId);
  }

  async canReadAlquiler(actor: AuthenticatedUser, alquilerId: string): Promise<boolean> {
    const client = this.supabaseService.getAdminClient();
    const { data: alq } = await client
      .from('alquileres')
      .select('id, unidad_id, gestor_id, deleted_at')
      .eq('id', alquilerId)
      .single();

    if (!alq || alq.deleted_at) {
      return false;
    }

    return this.canReadUnidad(actor, alq.unidad_id);
  }

  async canManageAlquiler(actor: AuthenticatedUser, alquilerId: string): Promise<boolean> {
    const client = this.supabaseService.getAdminClient();
    const { data: alq } = await client
      .from('alquileres')
      .select('id, unidad_id, gestor_id, deleted_at')
      .eq('id', alquilerId)
      .single();

    if (!alq || alq.deleted_at) {
      return false;
    }

    return this.canManageUnidad(actor, alq.unidad_id);
  }

  async canReadInquilino(actor: AuthenticatedUser, inquilinoId: string): Promise<boolean> {
    const client = this.supabaseService.getAdminClient();
    const { data: inq } = await client
      .from('inquilinos')
      .select('id, gestor_id, deleted_at')
      .eq('id', inquilinoId)
      .single();

    if (!inq || inq.deleted_at) {
      return false;
    }

    if (actor.rol === 'gestor') {
      return inq.gestor_id === actor.id;
    }

    if (inq.gestor_id !== actor.workspace_id) {
      return false;
    }

    // Delegado can read only if linked to an active Alquiler in their readable scope
    const { data: alqs } = await client
      .from('alquileres')
      .select('id, unidad_id')
      .eq('inquilino_id', inquilinoId)
      .is('deleted_at', null);

    if (!alqs || alqs.length === 0) {
      return false;
    }

    for (const alq of alqs) {
      if (await this.canReadUnidad(actor, alq.unidad_id)) {
        return true;
      }
    }

    return false;
  }

  async canManageInquilino(actor: AuthenticatedUser, inquilinoId: string): Promise<boolean> {
    if (actor.rol === 'gestor') {
      return this.canReadInquilino(actor, inquilinoId);
    }

    const delegation = await this.getActiveDelegation(actor.id, actor.workspace_id);
    if (!delegation || delegation.estado !== 'activa' || delegation.permiso !== 'gestionar') {
      return false;
    }

    const client = this.supabaseService.getAdminClient();
    const { data: alqs } = await client
      .from('alquileres')
      .select('id, unidad_id')
      .eq('inquilino_id', inquilinoId)
      .is('deleted_at', null);

    if (!alqs || alqs.length === 0) {
      return false;
    }

    for (const alq of alqs) {
      if (await this.canManageUnidad(actor, alq.unidad_id)) {
        return true;
      }
    }

    return false;
  }
}
