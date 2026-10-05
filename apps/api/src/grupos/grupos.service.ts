import { Injectable, NotFoundException, UnprocessableEntityException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateGrupoDto } from './dto/create-grupo.dto.js';
import { UpdateGrupoDto } from './dto/update-grupo.dto.js';

@Injectable()
export class GruposService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private validateSenaConfig(activa?: boolean, tipo?: string, valor?: number) {
    const isActiva = !!activa;
    const val = valor !== undefined ? Number(valor) : 0;
    const t = tipo || 'porcentaje';

    if (val < 0) {
      throw new BadRequestException('El valor de la seña no puede ser negativo');
    }

    if (isActiva && val <= 0) {
      throw new BadRequestException('El valor de la seña por defecto debe ser mayor a 0 cuando está activa');
    }

    if (t === 'porcentaje' && val > 100) {
      throw new BadRequestException('El porcentaje de seña por defecto no puede superar el 100%');
    }
  }

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
    return data || [];
  }

  async findOne(id: string, token: string) {
    const supabase = this.supabaseService.getClient(token);
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw new NotFoundException('Grupo no encontrado');
    }
    return data;
  }

  async create(createDto: CreateGrupoDto | string, gestorId: string, token: string) {
    const supabase = this.supabaseService.getClient(token);
    const payload: any = typeof createDto === 'string' ? { nombre: createDto } : { ...createDto };
    payload.gestor_id = gestorId;

    if (typeof createDto !== 'string') {
      this.validateSenaConfig(
        createDto.sena_default_activa,
        createDto.sena_default_tipo,
        createDto.sena_default_valor,
      );
    }
    
    const { data, error } = await supabase
      .from('grupos')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new UnprocessableEntityException(error?.message || 'Error al crear el grupo');
    }
    return data;
  }

  async update(id: string, updateDto: UpdateGrupoDto, token: string) {
    const supabase = this.supabaseService.getClient(token);
    const current = await this.findOne(id, token);

    const activa = updateDto.sena_default_activa !== undefined
      ? updateDto.sena_default_activa
      : current.sena_default_activa;
    const tipo = updateDto.sena_default_tipo !== undefined
      ? updateDto.sena_default_tipo
      : current.sena_default_tipo;
    const valor = updateDto.sena_default_valor !== undefined
      ? Number(updateDto.sena_default_valor)
      : Number(current.sena_default_valor || 0);

    this.validateSenaConfig(activa, tipo, valor);

    const { data, error } = await supabase
      .from('grupos')
      .update(updateDto)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      throw new UnprocessableEntityException(error?.message || 'Error al actualizar grupo');
    }
    return data;
  }

  async remove(id: string, token: string) {
    const supabase = this.supabaseService.getClient(token);
    const { data, error } = await supabase.rpc('archive_grupo', {
      p_grupo_id: id,
    });

    const res = data as { success?: boolean; id?: string } | null;
    if (error || !res || res.success !== true || res.id !== id) {
      throw new UnprocessableEntityException(error?.message || 'Error al eliminar grupo');
    }
    return { success: true };
  }
}
