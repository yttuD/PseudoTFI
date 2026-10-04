import { Injectable, UnprocessableEntityException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateUnidadDto } from './dto/create-unidad.dto.js';
import { UpdateUnidadDto } from './dto/update-unidad.dto.js';
import { CambiarEstadoDto, UnidadEstado } from './dto/cambiar-estado.dto.js';
import { GetUnidadesDto } from './dto/get-unidades.dto.js';
import { CreateModalidadPrecioDto } from './dto/create-modalidad-precio.dto.js';
import { UpdateModalidadPrecioDto } from './dto/update-modalidad-precio.dto.js';
import { CupoService } from '../cupo/cupo.service.js';
import { TraduccionService } from '../common/services/traduccion/traduccion.service.js';
import type { DelegationConfiguration } from '../authorization/authorization.types.js';

@Injectable()
export class UnidadesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cupoService: CupoService,
    private readonly traduccionService: TraduccionService,
  ) {}

  async create(createDto: CreateUnidadDto, token: string, workspaceId: string) {
    await this.cupoService.validarCupo(token);
    
    // Auto-translation logic
    let { titulo_es, descripcion_es, titulo_en, titulo_pt, descripcion_en, descripcion_pt, auto_traducir } = createDto;

    if (auto_traducir !== false) {
      if (titulo_es && !titulo_en) {
        titulo_en = await this.traduccionService.traducir(titulo_es, 'en');
      }
      if (titulo_es && !titulo_pt) {
        titulo_pt = await this.traduccionService.traducir(titulo_es, 'pt');
      }
      if (descripcion_es && !descripcion_en) {
        descripcion_en = await this.traduccionService.traducir(descripcion_es, 'en');
      }
      if (descripcion_es && !descripcion_pt) {
        descripcion_pt = await this.traduccionService.traducir(descripcion_es, 'pt');
      }
    }

    const supabase = this.supabaseService.getClient(token);
    const { data, error } = await supabase
      .from('unidades')
      .insert({
        gestor_id: workspaceId,
        categoria: createDto.categoria,
        zona_id: createDto.zona_id,
        grupo_id: createDto.grupo_id,
        estado: UnidadEstado.Publicada,
        titulo_es: createDto.titulo_es,
        descripcion_es: createDto.descripcion_es,
        whatsapp: createDto.whatsapp,
        instagram: createDto.instagram,
        titulo_en,
        titulo_pt,
        descripcion_en,
        descripcion_pt,
      })
      .select()
      .single();

    if (error || !data) {
      throw new UnprocessableEntityException(error?.message || 'Error al crear la unidad');
    }

    return data;
  }

  async findAll(
    query: GetUnidadesDto,
    token: string,
    workspaceId: string,
    scope?: DelegationConfiguration,
  ) {
    const { page = 1, limit = 20 } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (scope && scope.alcanceTipo === 'unidades') {
      if (!scope.unidadIds || scope.unidadIds.length === 0) {
        return { data: [], count: 0, page, limit };
      }
    }

    const supabase = this.supabaseService.getClient(token);
    let queryBuilder = supabase
      .from('unidades')
      .select('*', { count: 'exact' })
      .eq('gestor_id', workspaceId)
      .is('deleted_at', null);

    if (scope) {
      if (scope.alcanceTipo === 'grupo') {
        queryBuilder = queryBuilder.eq('grupo_id', scope.grupoId);
      } else if (scope.alcanceTipo === 'unidades') {
        queryBuilder = queryBuilder.in('id', scope.unidadIds);
      }
    }

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }

    return { data: data || [], count: count || 0, page, limit };
  }

  async findOne(id: string, token: string) {
    const supabase = this.supabaseService.getClient(token);
    const { data, error } = await supabase
      .from('unidades')
      .select('*, modalidades_precio(*)')
      .eq('id', id)
      .is('modalidades_precio.deleted_at', null)
      .single();

    if (error || !data) {
      throw new NotFoundException('Unidad no encontrada');
    }

    return data;
  }

  async update(id: string, updateDto: UpdateUnidadDto, token: string, workspaceId?: string) {
    const finalUpdateDto = { ...updateDto };

    if (finalUpdateDto.auto_traducir !== false) {
      if (finalUpdateDto.titulo_es && !finalUpdateDto.titulo_en) {
        finalUpdateDto.titulo_en = await this.traduccionService.traducir(finalUpdateDto.titulo_es, 'en');
      }
      if (finalUpdateDto.titulo_es && !finalUpdateDto.titulo_pt) {
        finalUpdateDto.titulo_pt = await this.traduccionService.traducir(finalUpdateDto.titulo_es, 'pt');
      }

      if (finalUpdateDto.descripcion_es && !finalUpdateDto.descripcion_en) {
        finalUpdateDto.descripcion_en = await this.traduccionService.traducir(finalUpdateDto.descripcion_es, 'en');
      }
      if (finalUpdateDto.descripcion_es && !finalUpdateDto.descripcion_pt) {
        finalUpdateDto.descripcion_pt = await this.traduccionService.traducir(finalUpdateDto.descripcion_es, 'pt');
      }
    }
    delete (finalUpdateDto as any).auto_traducir;

    const supabase = this.supabaseService.getClient(token);

    let updateQuery = supabase
      .from('unidades')
      .update(finalUpdateDto)
      .eq('id', id);

    if (workspaceId) {
      updateQuery = updateQuery.eq('gestor_id', workspaceId);
    }

    const { data, error } = await updateQuery.select().single();

    if (error || !data) {
      throw new UnprocessableEntityException(error?.message || 'Error al actualizar la unidad');
    }

    return data;
  }

  async cambiarEstado(id: string, dto: CambiarEstadoDto, token: string) {
    const supabase = this.supabaseService.getClient(token);
    
    // Primero, obtener la unidad actual para validar la transición
    const unidad = await this.findOne(id, token);
    const estadoActual = unidad.estado as UnidadEstado;
    const nuevoEstado = dto.estado;

    if (estadoActual === nuevoEstado) {
      return unidad;
    }

    // Estados de solo lectura
    const estadosSoloLectura = [
      UnidadEstado.EnRevision,
      UnidadEstado.Suspendida,
      UnidadEstado.BloqueadaPorImpago,
    ];
    if (estadosSoloLectura.includes(nuevoEstado) || estadosSoloLectura.includes(estadoActual)) {
      throw new UnprocessableEntityException(`Transición inválida desde/hacia el estado ${nuevoEstado} (solo lectura)`);
    }

    // Validar transición según máquina de estados
    let transicionValida = false;
    switch (estadoActual) {
      case UnidadEstado.Borrador:
        transicionValida = ['publicada', 'archivada'].includes(nuevoEstado);
        break;
      case UnidadEstado.Publicada:
        transicionValida = ['pausada', 'no_disponible', 'archivada', 'borrador'].includes(nuevoEstado);
        break;
      case UnidadEstado.Pausada:
        transicionValida = ['publicada', 'no_disponible', 'archivada', 'borrador'].includes(nuevoEstado);
        break;
      case UnidadEstado.NoDisponible:
        transicionValida = ['publicada', 'pausada', 'archivada'].includes(nuevoEstado);
        break;
      case UnidadEstado.Archivada:
        transicionValida = nuevoEstado === 'borrador';
        break;
    }

    if (!transicionValida) {
      throw new UnprocessableEntityException(`Transición inválida de ${estadoActual} a ${nuevoEstado}`);
    }

    // Validar transiciones específicas
    if (estadoActual === UnidadEstado.Archivada && nuevoEstado === UnidadEstado.Borrador) {
      if (unidad.archivada_at) {
        const archivadaAt = new Date(unidad.archivada_at);
        const hoy = new Date();
        const diffMs = hoy.getTime() - archivadaAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (diffDays < 15) {
          const expiryDate = new Date(archivadaAt);
          expiryDate.setDate(expiryDate.getDate() + 15);
          throw new UnprocessableEntityException(
            `Cooldown activo. Podés desarchivar a partir del ${expiryDate.toLocaleDateString('es-AR')}`
          );
        }
      }
    }

    // Validar cupo al desarchivar
    if (estadoActual === UnidadEstado.Archivada && (nuevoEstado === UnidadEstado.Borrador || nuevoEstado === UnidadEstado.Publicada)) {
      await this.cupoService.validarCupo(token);
    }

    const updates: any = {
      estado: nuevoEstado,
    };
    
    // Al archivar, setear archivada_at
    if (nuevoEstado === UnidadEstado.Archivada) {
      updates.archivada_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('unidades')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new UnprocessableEntityException(error?.message || 'Error al cambiar estado');
    }
    return data;
  }

  async remove(id: string, token: string) {
    const supabase = this.supabaseService.getClient(token);
    
    // Borrado lógico
    const { data, error } = await supabase
      .from('unidades')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Unidad no encontrada');
    }
    return data;
  }

  async createModalidad(unidadId: string, createDto: CreateModalidadPrecioDto, token: string) {
    const supabase = this.supabaseService.getClient(token);
    const { data, error } = await supabase
      .from('modalidades_precio')
      .insert({ ...createDto, unidad_id: unidadId })
      .select()
      .single();

    if (error || !data) {
      throw new UnprocessableEntityException(error?.message || 'Error al crear modalidad');
    }
    return data;
  }

  async updateModalidad(unidadId: string, modId: string, updateDto: UpdateModalidadPrecioDto, token: string) {
    const supabase = this.supabaseService.getClient(token);
    const { data, error } = await supabase
      .from('modalidades_precio')
      .update(updateDto)
      .eq('id', modId)
      .eq('unidad_id', unidadId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Modalidad no encontrada');
    }
    return data;
  }

  async removeModalidad(unidadId: string, modId: string, token: string) {
    const supabase = this.supabaseService.getClient(token);
    const { data, error } = await supabase
      .from('modalidades_precio')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', modId)
      .eq('unidad_id', unidadId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Modalidad no encontrada');
    }
    return data;
  }

  async getAlquileres(id: string, token: string) {
    const supabase = this.supabaseService.getClient(token);
    const { data, error } = await supabase
      .from('alquileres')
      .select(`
        *,
        inquilino:inquilinos(nombre_completo)
      `)
      .eq('unidad_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }
    return data || [];
  }
}
