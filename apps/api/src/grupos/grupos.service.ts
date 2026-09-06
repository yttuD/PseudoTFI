import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class GruposService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(gestorId: string, token: string) {
    const supabase = this.supabaseService.getClient(token);
    
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('gestor_id', gestorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }
    return data;
  }

  async create(nombre: string, gestorId: string, token: string) {
    const supabase = this.supabaseService.getClient(token);
    
    const { data, error } = await supabase
      .from('grupos')
      .insert({ nombre, gestor_id: gestorId })
      .select()
      .single();

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }
    return data;
  }
}
