import { Injectable, ForbiddenException, UnauthorizedException, ServiceUnavailableException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface CupoStatus {
  cupo_maximo: number;
  cupo_usado: number;
  cupo_disponible: number;
  suscripcion_expira_en: Date | null;
}

@Injectable()
export class CupoService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getCupo(token: string): Promise<CupoStatus> {
    const supabase = this.supabaseService.getClient(token);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) {
      throw new UnauthorizedException('Usuario no autenticado o token inválido');
    }
    const gestorId = authData.user.id;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('cupo_maximo, suscripcion_expira_en')
      .eq('id', gestorId)
      .single();

    if (userError) {
      throw new ServiceUnavailableException(`Error al consultar datos de usuario: ${userError.message}`);
    }
    if (!user) {
      throw new NotFoundException('Gestor no encontrado');
    }

    const { count, error: countError } = await supabase
      .from('unidades')
      .select('*', { count: 'exact', head: true })
      .eq('gestor_id', gestorId)
      .is('deleted_at', null)
      .neq('estado', 'archivada');

    if (countError) {
      throw new ServiceUnavailableException(`Error al consultar cupo usado: ${countError.message}`);
    }

    const cupoUsado = count || 0;
    const cupoMaximo = user.cupo_maximo ?? 3;
    const suscripcion_expira_en = user.suscripcion_expira_en ? new Date(user.suscripcion_expira_en) : null;

    return {
      cupo_maximo: cupoMaximo,
      cupo_usado: cupoUsado,
      cupo_disponible: Math.max(0, cupoMaximo - cupoUsado),
      suscripcion_expira_en,
    };
  }

  async validarCupo(token: string): Promise<void> {
    const status = await this.getCupo(token);
    if (status.cupo_usado >= status.cupo_maximo) {
      throw new ForbiddenException(`Alcanzaste tu límite de ${status.cupo_maximo} Unidades activas. Subí tu Cupo para crear más.`);
    }
  }
}
