import { Injectable, UnprocessableEntityException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
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
      [titulo_en, titulo_pt, descripcion_en, descripcion_pt] = await Promise.all([
        titulo_es && !titulo_en ? this.traduccionService.traducir(titulo_es, 'en') : titulo_en,
        titulo_es && !titulo_pt ? this.traduccionService.traducir(titulo_es, 'pt') : titulo_pt,
        descripcion_es && !descripcion_en ? this.traduccionService.traducir(descripcion_es, 'en') : descripcion_en,
        descripcion_es && !descripcion_pt ? this.traduccionService.traducir(descripcion_es, 'pt') : descripcion_pt,
      ]);
    }

    const supabase = this.supabaseService.getClient(token);
    const { data, error } = await supabase
      .from('unidades')
      .insert({
        gestor_id: workspaceId,
        categoria: createDto.categoria,
        zona_id: createDto.zona_id,
        grupo_id: createDto.grupo_id,
        estado: UnidadEstado.Borrador,
        titulo_es: createDto.titulo_es,
        descripcion_es: createDto.descripcion_es,
        whatsapp: createDto.whatsapp,
        instagram: createDto.instagram,
        fotos: createDto.fotos || [],
        ubicacion_aprox: createDto.ubicacion_aprox,
        ubicacion_exacta: createDto.ubicacion_exacta,
        direccion_texto: createDto.direccion_texto,
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
    const buildScopedQuery = (head = false) => {
      let q = supabase
        .from('unidades')
        .select('*', head ? { count: 'exact', head: true } : { count: 'exact' })
        .eq('gestor_id', workspaceId)
        .is('deleted_at', null);

      if (scope) {
        if (scope.alcanceTipo === 'grupo') {
          q = q.eq('grupo_id', scope.grupoId);
        } else if (scope.alcanceTipo === 'unidades') {
          q = q.in('id', scope.unidadIds);
        }
      }
      return q;
    };

    const { data, error, count } = await buildScopedQuery(false)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      const isPgrst103 = (error as { code?: string })?.code === 'PGRST103';
      if (isPgrst103 && from > 0) {
        const { count: headCount, error: headError } = await buildScopedQuery(true);
        if (
          !headError &&
          typeof headCount === 'number' &&
          Number.isSafeInteger(headCount) &&
          headCount >= 0 &&
          from >= headCount
        ) {
          return { data: [], count: headCount, page, limit };
        }
      }
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

    return {
      ...data,
      modalidades_precio: (data.modalidades_precio || []).filter((m: any) => !m.deleted_at),
    };
  }

  async update(id: string, updateDto: UpdateUnidadDto, token: string, workspaceId?: string) {
    const finalUpdateDto = { ...updateDto };

    if (finalUpdateDto.auto_traducir !== false) {
      [finalUpdateDto.titulo_en, finalUpdateDto.titulo_pt,
        finalUpdateDto.descripcion_en, finalUpdateDto.descripcion_pt] = await Promise.all([
        finalUpdateDto.titulo_es && !finalUpdateDto.titulo_en
          ? this.traduccionService.traducir(finalUpdateDto.titulo_es, 'en') : finalUpdateDto.titulo_en,
        finalUpdateDto.titulo_es && !finalUpdateDto.titulo_pt
          ? this.traduccionService.traducir(finalUpdateDto.titulo_es, 'pt') : finalUpdateDto.titulo_pt,
        finalUpdateDto.descripcion_es && !finalUpdateDto.descripcion_en
          ? this.traduccionService.traducir(finalUpdateDto.descripcion_es, 'en') : finalUpdateDto.descripcion_en,
        finalUpdateDto.descripcion_es && !finalUpdateDto.descripcion_pt
          ? this.traduccionService.traducir(finalUpdateDto.descripcion_es, 'pt') : finalUpdateDto.descripcion_pt,
      ]);
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

    const { data: activeRentals, error: rentalsError } = await supabase
      .from('alquileres')
      .select('id')
      .eq('unidad_id', id)
      .eq('estado', 'activo')
      .is('deleted_at', null)
      .limit(1);
    if (rentalsError) throw new UnprocessableEntityException('No se pudo verificar si la unidad tiene alquileres activos');
    if (activeRentals?.length) throw new UnprocessableEntityException('La unidad tiene alquileres activos y no se puede eliminar');
    
    // Borrado lógico atómico vía RPC archive_unidad
    const { data, error } = await supabase.rpc('archive_unidad', {
      p_unidad_id: id,
    });

    const res = data as { success?: boolean; id?: string; deleted_at?: string } | null;
    if (error || !res || res.success !== true || res.id !== id) {
      if (error?.message?.includes('alquileres activos')) {
        throw new UnprocessableEntityException('La unidad tiene alquileres activos y no se puede eliminar');
      }
      throw new NotFoundException('Unidad no encontrada');
    }
    return { success: true, id: res.id, deleted_at: res.deleted_at };
  }

  async createModalidad(
    unidadId: string,
    createDto: CreateModalidadPrecioDto,
    token: string,
    idempotencyKey?: string,
  ) {
    const supabase = this.supabaseService.getClient(token);
    // UUIDv8-style deterministic primary key: same unit + request UUID
    // produces exactly the same database row, even across API instances.
    // The database primary key resolves concurrent requests atomically.
    const hash = idempotencyKey
      ? createHash('sha256')
          .update(`rendo:tarifa:v1:${unidadId.toLowerCase()}:${idempotencyKey.toLowerCase()}`)
          .digest('hex')
      : null;
    const requestId = hash
      ? `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
      : null;
    const { data, error } = await supabase
      .from('modalidades_precio')
      .insert({ ...createDto, unidad_id: unidadId, ...(requestId ? { id: requestId } : {}) })
      .select()
      .single();

    if (error?.code === '23505' && requestId) {
      // A lost HTTP response must not produce a second tariff. Never update
      // an existing row implicitly, especially if it was already archived.
      const { data: existing, error: lookupError } = await supabase
        .from('modalidades_precio')
        .select('*')
        .eq('id', requestId)
        .eq('unidad_id', unidadId)
        .single();
      if (lookupError || !existing || existing.deleted_at) {
        throw new ConflictException('La operación original no puede reutilizarse. Recargá la unidad.');
      }
      const sameNumber = (a: unknown, b: unknown) =>
        a == null && b == null || (a != null && b != null && Number(a) === Number(b));
      if (existing.unidad_tiempo !== createDto.unidad_tiempo ||
          !sameNumber(existing.cantidad_tiempo, createDto.cantidad_tiempo) ||
          !sameNumber(existing.precio, createDto.precio) ||
          !sameNumber(existing.precio_usd, createDto.precio_usd) ||
          !sameNumber(existing.precio_brl, createDto.precio_brl)) {
        throw new ConflictException('Idempotency-Key reutilizada para una tarifa diferente');
      }
      return existing;
    }

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
