import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AuthenticatedUser } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { DelegationNotificationService } from './delegation-notification.service.js';
import { ConfigureDelegacionDto } from './dto/configure-delegacion.dto.js';
import {
  DelegadoInvitation,
  DelegationSummary,
  ReceivedInvitation,
  AccessContext,
} from '@tfi/types';
import { ActionLogService } from '../authorization/action-log.service.js';

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

@Injectable()
export class DelegadosService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly authzService: AuthorizationService,
    private readonly notificationService: DelegationNotificationService,
    private readonly actionLogService: ActionLogService,
  ) {}

  async createInvitation(
    gestorUser: AuthenticatedUser,
    emailRaw: string,
  ): Promise<DelegadoInvitation> {
    this.authzService.assertOwnerOnly(gestorUser);
    const email = emailRaw.trim().toLowerCase();
    const client = this.supabase.getAdminClient();

    // 1. Resolve target account in users profile table
    const { data: targetUser } = await client
      .from('users')
      .select('id, full_name, rol, workspace_id, deleted_at')
      .ilike('email', email)
      .is('deleted_at', null)
      .maybeSingle();

    // If users table doesn't have email column or not populated, query auth.users via rpc or admin auth
    let target = targetUser;
    if (!target) {
      try {
        const { data: authData } = await client.auth.admin.listUsers();
        const found = authData?.users?.find(
          (u) => u.email?.toLowerCase() === email,
        );
        if (found) {
          const { data: profile } = await client
            .from('users')
            .select('id, full_name, rol, workspace_id, deleted_at')
            .eq('id', found.id)
            .maybeSingle();
          if (profile && !profile.deleted_at) {
            target = profile;
          }
        }
      } catch {
        // Continue
      }
    }

    if (!target) {
      throw new BadRequestException(
        'El email no pertenece a una cuenta registrada y verificada en Rendo',
      );
    }

    // 2. Reject self-invitation at API level before RPC
    if (target.id === gestorUser.id) {
      throw new BadRequestException('No puedes invitar a tu propia cuenta');
    }

    // 3. Execute atomic invitation creation, durable outbox intent, and audit log via RPC
    // Caller's authenticated token ensures auth.uid() derives the actor inside the database transaction
    const userClient = this.supabase.getClient(gestorUser.token);
    const { data: invResult, error: invError } = await userClient.rpc(
      'create_delegado_invitation',
      {
        p_delegado_id: target.id,
      },
    );

    if (invError) {
      const msg = invError.message || 'Error al crear la invitación';
      if (
        msg.includes('Ya existe una invitación pendiente') ||
        msg.includes('ya cuenta con una delegación')
      ) {
        throw new ConflictException(msg);
      }
      throw new BadRequestException(msg);
    }

    const inv = invResult || {};

    return {
      id: inv.id,
      target: {
        displayName: target.full_name || email,
        maskedEmail: maskEmail(email),
      },
      estado: inv.estado || 'pendiente',
      expiresAt: inv.expires_at,
      channels: { inApp: 'created', email: 'pending' },
      createdAt: inv.created_at,
    };
  }

  async listDelegados(
    gestorUser: AuthenticatedUser,
  ): Promise<{ invitaciones: DelegadoInvitation[]; delegaciones: DelegationSummary[] }> {
    this.authzService.assertOwnerOnly(gestorUser);
    const client = this.supabase.getAdminClient();

    // 1. Fetch invitations
    const { data: invs } = await client
      .from('invitaciones_delegados')
      .select('*, target:users!delegado_id(id, full_name, email)')
      .eq('gestor_id', gestorUser.id)
      .order('created_at', { ascending: false });

    const invitaciones: DelegadoInvitation[] = (invs || []).map((i: any) => {
      const email = i.email_snapshot || i.email || '';
      return {
        id: i.id,
        target: {
          displayName: i.target?.full_name || email,
          maskedEmail: maskEmail(email),
        },
        estado: i.estado,
        expiresAt: i.expires_at,
        channels: {
          inApp: 'created',
          email: 'sent',
        },
        createdAt: i.created_at,
      };
    });

    // 2. Fetch delegaciones
    const { data: dels } = await client
      .from('delegaciones')
      .select(`
        *,
        delegado:users!delegado_id(id, full_name, email),
        grupo:grupos(id, nombre)
      `)
      .eq('gestor_id', gestorUser.id)
      .neq('estado', 'revocada')
      .order('created_at', { ascending: false });

    const delegaciones: DelegationSummary[] = [];
    for (const d of dels || []) {
      const email = d.delegado?.email || '';
      const summary: DelegationSummary = {
        id: d.id,
        delegado: {
          id: d.delegado?.id || d.delegado_id,
          displayName: d.delegado?.full_name || email,
          maskedEmail: maskEmail(email),
        },
        estado: d.estado,
        permiso: d.permiso,
        alcanceTipo: d.alcance_tipo,
        grupo: d.grupo ? { id: d.grupo.id, nombre: d.grupo.nombre } : null,
        updatedAt: d.updated_at,
      };

      if (d.alcance_tipo === 'unidades') {
        const { data: units } = await client
          .from('delegacion_unidades')
          .select('unidad:unidades(id, titulo_es)')
          .eq('delegacion_id', d.id);
        summary.unidades = (units || []).map((u: any) => ({
          id: u.unidad?.id,
          nombre: u.unidad?.titulo_es || 'Unidad',
        }));
      }

      delegaciones.push(summary);
    }

    return { invitaciones, delegaciones };
  }

  async listReceivedInvitations(
    delegadoUser: AuthenticatedUser,
  ): Promise<ReceivedInvitation[]> {
    const client = this.supabase.getAdminClient();
    const { data: invs } = await client
      .from('invitaciones_delegados')
      .select('*, gestor:users!gestor_id(id, full_name, email)')
      .eq('delegado_id', delegadoUser.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    const now = new Date();
    return (invs || []).map((i: any) => {
      const isExpired = new Date(i.expires_at) < now;
      return {
        id: i.id,
        gestorDisplayName: i.gestor?.full_name || i.gestor?.email || 'Gestor',
        estado: isExpired ? 'expirada' : 'pendiente',
        expiresAt: i.expires_at,
        createdAt: i.created_at,
      };
    });
  }

  async acceptInvitation(
    invitationId: string,
    delegadoUser: AuthenticatedUser,
  ): Promise<AccessContext> {
    const client = this.supabase.getClient(delegadoUser.token);

    if (typeof (client as any).rpc !== 'function') {
      throw new InternalServerErrorException('El cliente de base de datos no soporta RPCs transaccionales');
    }

    const { error } = await (client as any).rpc('accept_delegado_invitation', {
      p_invitation_id: invitationId,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('no encontrada') || msg.includes('no válido')) {
        throw new NotFoundException(msg);
      }
      if (
        msg.includes('expirado') ||
        msg.includes('no está pendiente') ||
        msg.includes('ya pertenece') ||
        msg.includes('ya posee')
      ) {
        throw new ConflictException(msg);
      }
      if (msg.includes('No autenticado')) {
        throw new ForbiddenException(msg);
      }
      throw new BadRequestException(msg);
    }

    return {
      actor: 'delegado',
      state: 'pendiente_configuracion',
      ownerOnly: false,
      capabilities: [],
    };
  }

  async rejectInvitation(
    invitationId: string,
    delegadoUser: AuthenticatedUser,
  ): Promise<void> {
    const client = this.supabase.getClient(delegadoUser.token);

    if (typeof (client as any).rpc !== 'function') {
      throw new InternalServerErrorException('El cliente de base de datos no soporta RPCs transaccionales');
    }

    const { error } = await (client as any).rpc('reject_delegado_invitation', {
      p_invitation_id: invitationId,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('no encontrada')) throw new NotFoundException(msg);
      if (msg.includes('no está pendiente')) throw new ConflictException(msg);
      if (msg.includes('No autenticado')) throw new ForbiddenException(msg);
      throw new BadRequestException(msg);
    }
  }

  async cancelInvitation(
    invitationId: string,
    gestorUser: AuthenticatedUser,
  ): Promise<void> {
    this.authzService.assertOwnerOnly(gestorUser);
    const client = this.supabase.getClient(gestorUser.token);

    if (typeof (client as any).rpc !== 'function') {
      throw new InternalServerErrorException('El cliente de base de datos no soporta RPCs transaccionales');
    }

    const { error } = await (client as any).rpc('cancel_delegado_invitation', {
      p_invitation_id: invitationId,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('no encontrada')) throw new NotFoundException(msg);
      if (msg.includes('cancelar') || msg.includes('pendiente')) throw new ConflictException(msg);
      if (msg.includes('No autenticado')) throw new ForbiddenException(msg);
      throw new BadRequestException(msg);
    }
  }

  async configureDelegado(
    delegationId: string,
    gestorUser: AuthenticatedUser,
    dto: ConfigureDelegacionDto,
  ): Promise<DelegationSummary> {
    this.authzService.assertOwnerOnly(gestorUser);
    const client = this.supabase.getClient(gestorUser.token);

    if (typeof (client as any).rpc !== 'function') {
      throw new InternalServerErrorException('El cliente de base de datos no soporta RPCs transaccionales');
    }

    const { error: rpcErr } = await (client as any).rpc('configure_delegacion', {
      p_delegacion_id: delegationId,
      p_permiso: dto.permiso,
      p_alcance_tipo: dto.alcanceTipo,
      p_grupo_id: dto.alcanceTipo === 'grupo' ? dto.grupoId : null,
      p_unidad_ids: dto.alcanceTipo === 'unidades' ? (dto.unidadIds || []) : [],
    });

    if (rpcErr) {
      const msg = rpcErr.message || '';
      if (msg.includes('no encontrada')) throw new NotFoundException(msg);
      if (msg.includes('revocada')) throw new ConflictException(msg);
      if (msg.includes('No autenticado')) throw new ForbiddenException(msg);
      throw new BadRequestException(msg);
    }

    // Authoritative read of configuration saved by transactional RPC without repeating mutations
    const adminClient = this.supabase.getAdminClient();
    const { data: updated, error: readErr } = await adminClient
      .from('delegaciones')
      .select(`
        *,
        delegado:users!delegado_id(id, full_name, email),
        grupo:grupos(id, nombre)
      `)
      .eq('id', delegationId)
      .single();

    if (readErr || !updated) {
      throw new NotFoundException('Delegación configurada pero no se pudo leer el registro');
    }

    let assignedUnits: Array<{ id: string; nombre: string }> = [];
    if (updated.alcance_tipo === 'unidades') {
      const { data: unitsData } = await adminClient
        .from('delegacion_unidades')
        .select('unidad:unidades(id, titulo_es)')
        .eq('delegacion_id', delegationId);

      assignedUnits = (unitsData || []).map((u: any) => ({
        id: u.unidad?.id,
        nombre: u.unidad?.titulo_es || 'Unidad',
      }));
    }

    const email = updated.delegado?.email || '';
    return {
      id: updated.id,
      delegado: {
        id: updated.delegado?.id || updated.delegado_id,
        displayName: updated.delegado?.full_name || email,
        maskedEmail: maskEmail(email),
      },
      estado: updated.estado,
      permiso: updated.permiso,
      alcanceTipo: updated.alcance_tipo,
      grupo: updated.grupo ? { id: updated.grupo.id, nombre: updated.grupo.nombre } : null,
      unidades: assignedUnits,
      updatedAt: updated.updated_at,
    };
  }

  async revokeDelegado(
    delegationId: string,
    gestorUser: AuthenticatedUser,
  ): Promise<void> {
    this.authzService.assertOwnerOnly(gestorUser);
    const client = this.supabase.getClient(gestorUser.token);

    if (typeof (client as any).rpc !== 'function') {
      throw new InternalServerErrorException('El cliente de base de datos no soporta RPCs transaccionales');
    }

    const { error: rpcErr } = await (client as any).rpc('revoke_delegacion', {
      p_delegacion_id: delegationId,
    });

    if (rpcErr) {
      const msg = rpcErr.message || '';
      if (msg.includes('no encontrada')) throw new NotFoundException(msg);
      if (msg.includes('revocada')) throw new ConflictException(msg);
      if (msg.includes('No autenticado')) throw new ForbiddenException(msg);
      throw new BadRequestException(msg);
    }
  }
}
