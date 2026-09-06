import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
    
    // First, get the authenticated user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    
    const gestorId = authData.user.id;

    // Get the user's cupo_maximo and created_at from public.users
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('cupo_maximo, suscripcion_expira_en')
      .eq('id', gestorId)
      .single();

    if (userError || !user) {
      throw new ForbiddenException('No se encontró el perfil de Gestor');
    }

    // Get the active units count
    const { count, error: countError } = await supabase
      .from('unidades')
      .select('*', { count: 'exact', head: true })
      .eq('gestor_id', gestorId)
      .is('deleted_at', null)
      .neq('estado', 'archivada');

    if (countError) {
      throw new ForbiddenException('No se pudo calcular el cupo usado');
    }

    const cupoUsado = count || 0;
    const cupoMaximo = user.cupo_maximo;
    
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
