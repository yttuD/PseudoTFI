import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateInquilinoDto } from './dto/create-inquilino.dto.js';
import { UpdateInquilinoDto } from './dto/update-inquilino.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class InquilinosService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createInquilinoDto: CreateInquilinoDto, token: string, workspaceId: string) {
    const client = this.supabaseService.getClient(token);

    // El workspaceId viene validado desde el AuthGuard.

    const { data, error } = await client
      .from('inquilinos')
      .insert([
        {
          gestor_id: workspaceId,
          ...createInquilinoDto,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }

    return data;
  }

  async findAll(token: string, limit = 10, offset = 0) {
    const client = this.supabaseService.getClient(token);

    const { data, error, count } = await client
      .from('inquilinos')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }

    return {
      data,
      total: count,
      limit,
      offset,
    };
  }

  async update(id: string, updateInquilinoDto: UpdateInquilinoDto, token: string) {
    const client = this.supabaseService.getClient(token);

    const { data, error } = await client
      .from('inquilinos')
      .update(updateInquilinoDto)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Inquilino no encontrado');
      }
      throw new UnprocessableEntityException(error.message);
    }

    return data;
  }

  async remove(id: string, token: string) {
    const client = this.supabaseService.getClient(token);

    const { data, error } = await client
      .from('inquilinos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Inquilino no encontrado');
      }
      throw new UnprocessableEntityException(error.message);
    }

    return { message: 'Inquilino borrado lógicamente' };
  }
}
