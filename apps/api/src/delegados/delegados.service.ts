import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class DelegadosService {
  constructor(private supabase: SupabaseService) {}

  async invitar(email: string, gestorId: string, rol: string) {
    if (rol !== 'gestor') {
      throw new UnauthorizedException('Solo el gestor principal puede invitar delegados');
    }

    const { data, error } = await this.supabase.getClient()
      .from('invitaciones_delegados')
      .insert({ gestor_id: gestorId, email: email.toLowerCase() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        throw new BadRequestException('El email ya tiene una invitación pendiente o ya es delegado');
      }
      throw new Error(error.message);
    }

    return data;
  }

  async findAll(workspaceId: string) {
    const supabaseClient = this.supabase.getClient();

    // Invitaciones pendientes
    const { data: invitaciones, error: invError } = await supabaseClient
      .from('invitaciones_delegados')
      .select('*')
      .eq('gestor_id', workspaceId)
      .eq('usada', false);

    if (invError) throw new Error(invError.message);

    // Delegados activos
    const { data: activos, error: actError } = await supabaseClient
      .from('users')
      .select('id, full_name, phone, created_at')
      .eq('workspace_id', workspaceId)
      .eq('rol', 'delegado');

    // Wait, users table doesn't have email in public schema by default. I need to check how to get emails for active users.
    // If not possible, I'll just return what's in public.users. But let's check `users` definition again.

    return {
      pendientes: invitaciones || [],
      activos: activos || []
    };
  }
}
