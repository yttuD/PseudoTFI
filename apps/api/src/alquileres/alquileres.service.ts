import { Injectable, NotFoundException, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { CreateAlquilerDto } from './dto/create-alquiler.dto.js';
import { UpdateAlquilerDto } from './dto/update-alquiler.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class AlquileresService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async validateUnidad(client: any, unidad_id: string) {
    const { data, error } = await client
      .from('unidades')
      .select('id')
      .eq('id', unidad_id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Unidad no encontrada o no pertenece al gestor actual');
    }
  }

  async create(createAlquilerDto: CreateAlquilerDto, token: string, workspaceId: string) {
    if (createAlquilerDto.fecha_fin < createAlquilerDto.fecha_inicio) {
      throw new BadRequestException('fecha_fin no puede ser anterior a fecha_inicio');
    }

    const client = this.supabaseService.getClient(token);

    // El workspaceId viene validado desde el AuthGuard.

    await this.validateUnidad(client, createAlquilerDto.unidad_id);

    const { data: inquilinoData, error: inquilinoError } = await client
      .from('inquilinos')
      .select('id')
      .eq('id', createAlquilerDto.inquilino_id)
      .is('deleted_at', null)
      .single();

    if (inquilinoError || !inquilinoData) {
      throw new NotFoundException('Inquilino no encontrado');
    }

    const { data, error } = await client
      .from('alquileres')
      .insert([
        {
          gestor_id: workspaceId,
          unidad_id: createAlquilerDto.unidad_id,
          inquilino_id: createAlquilerDto.inquilino_id,
          fecha_inicio: createAlquilerDto.fecha_inicio.toISOString().split('T')[0],
          fecha_fin: createAlquilerDto.fecha_fin.toISOString().split('T')[0],
          monto_total: createAlquilerDto.monto_total,
          observaciones: createAlquilerDto.observaciones,
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
      .from('alquileres')
      .select(`
        *,
        unidad:unidades(titulo_es),
        inquilino:inquilinos(nombre_completo)
      `, { count: 'exact' })
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

  async update(id: string, updateAlquilerDto: UpdateAlquilerDto, token: string) {
    const client = this.supabaseService.getClient(token);

    if (updateAlquilerDto.unidad_id) {
      await this.validateUnidad(client, updateAlquilerDto.unidad_id);
    }

    const { data: currentAlquiler, error: currentError } = await client
      .from('alquileres')
      .select('fecha_inicio, fecha_fin')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (currentError || !currentAlquiler) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    const newFechaInicio = updateAlquilerDto.fecha_inicio || new Date(currentAlquiler.fecha_inicio);
    const newFechaFin = updateAlquilerDto.fecha_fin || new Date(currentAlquiler.fecha_fin);

    if (newFechaFin < newFechaInicio) {
      throw new BadRequestException('fecha_fin no puede ser anterior a fecha_inicio');
    }

    const updatePayload: any = { ...updateAlquilerDto };

    if (updateAlquilerDto.fecha_inicio) {
      updatePayload.fecha_inicio = updateAlquilerDto.fecha_inicio.toISOString().split('T')[0];
    }
    if (updateAlquilerDto.fecha_fin) {
      updatePayload.fecha_fin = updateAlquilerDto.fecha_fin.toISOString().split('T')[0];
    }

    const { data, error } = await client
      .from('alquileres')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }

    return data;
  }

  async remove(id: string, token: string) {
    const client = this.supabaseService.getClient(token);

    const { data, error } = await client
      .from('alquileres')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Alquiler no encontrado');
      }
      throw new UnprocessableEntityException(error.message);
    }

    return { message: 'Alquiler borrado lógicamente' };
  }
}
