import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface LogActionParams {
  gestorId: string;
  actorId: string;
  actorRol: 'gestor' | 'delegado' | 'admin';
  accion: string;
  recursoTipo: string;
  recursoId?: string;
  metadata?: Record<string, unknown>;
}

export interface ActionLogRecord {
  id: string;
  gestor_id: string;
  actor_id: string;
  actor_rol: string;
  accion: string;
  recurso_tipo: string;
  recurso_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

@Injectable()
export class ActionLogService {
  private readonly logger = new Logger(ActionLogService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Appends an immutable actor-attributed action record into log_acciones.
   * Throws on failure to guarantee audit completeness.
   */
  async logAction(params: LogActionParams): Promise<void> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client.from('log_acciones').insert({
      gestor_id: params.gestorId,
      actor_id: params.actorId,
      actor_rol: params.actorRol,
      accion: params.accion,
      recurso_tipo: params.recursoTipo,
      recurso_id: params.recursoId || null,
      metadata: params.metadata || {},
    });

    if (error) {
      this.logger.error(`Error logging action ${params.accion}: ${error.message}`);
      throw new InternalServerErrorException(`Fallo en el registro de auditoría: ${error.message}`);
    }
  }

  /**
   * Authoritative retrieval of action logs for the Gestor owner.
   */
  async getLogs(
    gestorId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ data: ActionLogRecord[]; total: number }> {
    const client = this.supabaseService.getAdminClient();
    const { data, error, count } = await client
      .from('log_acciones')
      .select('*', { count: 'exact' })
      .eq('gestor_id', gestorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error(`Error fetching action logs for gestor ${gestorId}: ${error.message}`);
      return { data: [], total: 0 };
    }

    return {
      data: (data || []) as ActionLogRecord[],
      total: count || (data?.length ?? 0),
    };
  }
}
