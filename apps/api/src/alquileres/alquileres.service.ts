import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateAlquilerDto } from './dto/create-alquiler.dto.js';
import { UpdateAlquilerDto } from './dto/update-alquiler.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  normalizeModality,
  getBuenosAiresCalendarDate,
  parseBuenosAiresLegacyInterval,
  RentalModality,
} from '@tfi/types';

@Injectable()
export class AlquileresService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async validateUnidad(client: any, unidad_id: string) {
    const { data, error } = await client
      .from('unidades')
      .select('id, grupo_id, modalidades_precio(*)')
      .eq('id', unidad_id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Unidad no encontrada o no pertenece al gestor actual');
    }
    return data;
  }

  private resolveIntervals(dto: {
    inicio_at?: string;
    fin_at?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    modalidad?: string;
  }): { inicioAt: Date; finAt: Date; fechaInicioStr: string; fechaFinStr: string } {
    let inicioAt: Date;
    let finAt: Date;

    if (dto.inicio_at && dto.fin_at) {
      inicioAt = new Date(dto.inicio_at);
      finAt = new Date(dto.fin_at);
    } else if (dto.fecha_inicio && dto.fecha_fin) {
      const legacy = parseBuenosAiresLegacyInterval(dto.fecha_inicio, dto.fecha_fin);
      inicioAt = legacy.start;
      finAt = legacy.end;
    } else {
      throw new BadRequestException('Debe especificar fechas o intervalos válidos');
    }

    if (isNaN(inicioAt.getTime()) || isNaN(finAt.getTime())) {
      throw new BadRequestException('Formato de fecha u hora inválido');
    }

    if (finAt.getTime() <= inicioAt.getTime()) {
      throw new BadRequestException('La fecha/hora de fin debe ser posterior a la de inicio');
    }

    // Derive compatibility dates from America/Argentina/Buenos_Aires calendar dates
    const fechaInicioStr = getBuenosAiresCalendarDate(inicioAt);
    // For date-only representation of the interval:
    // If finAt falls on midnight exactly (e.g. 00:00:00 ART), its inclusive end calendar day is the day before.
    // However, for cross-midnight hourly rentals (e.g. 22:00 ART -> 02:00 ART next day), finAt is 02:00 ART on the next day.
    const fechaFinStr = getBuenosAiresCalendarDate(
      finAt.getUTCHours() === 3 && finAt.getUTCMinutes() === 0 && finAt.getUTCSeconds() === 0 && finAt.getUTCMilliseconds() === 0
        ? new Date(finAt.getTime() - 1000)
        : finAt,
    );

    return { inicioAt, finAt, fechaInicioStr, fechaFinStr };
  }

  private async checkOverlap(
    client: any,
    unidadId: string,
    inicioAt: Date,
    finAt: Date,
    excludeId?: string,
  ): Promise<void> {
    let query = client
      .from('alquileres')
      .select('id, inicio_at, fin_at, fecha_inicio, fecha_fin')
      .eq('unidad_id', unidadId)
      .is('deleted_at', null)
      .neq('estado', 'cancelado');

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: existingRentals, error } = await query;
    if (error) {
      throw new UnprocessableEntityException(
        `Error al verificar disponibilidad de la unidad: ${error.message || 'Error de consulta'}`,
      );
    }
    if (!existingRentals) return;

    const newStart = inicioAt.getTime();
    const newEnd = finAt.getTime();

    for (const ex of existingRentals) {
      let exStart: number;
      let exEnd: number;

      if (ex.inicio_at && ex.fin_at) {
        exStart = new Date(ex.inicio_at).getTime();
        exEnd = new Date(ex.fin_at).getTime();
      } else if (ex.fecha_inicio && ex.fecha_fin) {
        // Legacy rows lacking timestamps: interpret inclusive fecha_fin as next Buenos Aires midnight
        const legacy = parseBuenosAiresLegacyInterval(ex.fecha_inicio, ex.fecha_fin);
        exStart = legacy.start.getTime();
        exEnd = legacy.end.getTime();
      } else {
        continue;
      }

      // Half-open interval collision [newStart, newEnd) vs [exStart, exEnd)
      // Positive intersection exists if and only if newStart < exEnd && newEnd > exStart
      if (newStart < exEnd && newEnd > exStart) {
        throw new ConflictException('Superposición de fechas detectada para la unidad seleccionada.');
      }
    }
  }

  private async resolveSena(
    client: any,
    unidadData: any,
    montoTotal: number,
    senaEleccionInput?: string,
    senaTipoInput?: 'porcentaje' | 'monto_fijo' | null,
    senaValorInput?: number | null,
    montoSenaInput?: number | null,
  ): Promise<{
    senaEleccion: 'sin_sena' | 'heredar_grupo' | 'personalizada';
    senaTipo: 'porcentaje' | 'monto_fijo' | null;
    senaValor: number | null;
    senaOrigenGrupoId: string | null;
    montoSena: number;
  }> {
    let senaEleccion = senaEleccionInput;
    if (!senaEleccion) {
      if (montoSenaInput && Number(montoSenaInput) > 0) {
        senaEleccion = 'personalizada';
      } else {
        senaEleccion = 'sin_sena';
      }
    }

    if (senaEleccion === 'sin_sena') {
      return {
        senaEleccion: 'sin_sena',
        senaTipo: null,
        senaValor: null,
        senaOrigenGrupoId: null,
        montoSena: 0,
      };
    }

    if (senaEleccion === 'heredar_grupo') {
      if (!unidadData.grupo_id) {
        throw new BadRequestException('La unidad no pertenece a ningún grupo para heredar seña');
      }

      const { data: grupoData, error: grupoError } = await client
        .from('grupos')
        .select('*')
        .eq('id', unidadData.grupo_id)
        .is('deleted_at', null)
        .single();

      if (
        grupoError ||
        !grupoData ||
        !grupoData.sena_default_activa ||
        Number(grupoData.sena_default_valor) <= 0
      ) {
        throw new BadRequestException(
          'El grupo no posee una configuración activa de seña por defecto válida (debe ser mayor a 0)',
        );
      }

      const senaTipo = (grupoData.sena_default_tipo || 'porcentaje') as 'porcentaje' | 'monto_fijo';
      const senaValor = Number(grupoData.sena_default_valor);
      const senaOrigenGrupoId = grupoData.id;

      let montoSena = 0;
      if (senaTipo === 'porcentaje') {
        if (senaValor <= 0 || senaValor > 100) {
          throw new BadRequestException('El porcentaje de seña por defecto del grupo debe estar entre 1 y 100');
        }
        montoSena = Math.round((montoTotal * senaValor) / 100);
      } else {
        montoSena = Math.min(montoTotal, senaValor);
      }

      if (montoTotal > 0 && montoSena <= 0) {
        throw new BadRequestException('El monto calculado de seña heredada debe ser mayor a 0');
      }

      return {
        senaEleccion: 'heredar_grupo',
        senaTipo,
        senaValor,
        senaOrigenGrupoId,
        montoSena,
      };
    }

    if (senaEleccion === 'personalizada') {
      if (!senaTipoInput) {
        throw new BadRequestException('La seña personalizada requiere un tipo explícito (porcentaje o monto_fijo)');
      }
      if (senaValorInput === undefined || senaValorInput === null || isNaN(Number(senaValorInput))) {
        throw new BadRequestException('La seña personalizada requiere un valor numérico explícito');
      }

      const senaTipo = senaTipoInput;
      const senaValor = Number(senaValorInput);

      if (senaValor <= 0) {
        throw new BadRequestException('El valor de la seña personalizada debe ser estrictamente mayor a 0');
      }

      let montoSena = 0;
      if (senaTipo === 'porcentaje') {
        if (senaValor > 100) {
          throw new BadRequestException('El porcentaje de seña debe ser mayor a 0 y menor o igual a 100');
        }
        montoSena = Math.round((montoTotal * senaValor) / 100);
      } else if (senaTipo === 'monto_fijo') {
        montoSena = senaValor;
      } else {
        throw new BadRequestException(`Tipo de seña personalizada no válido: ${senaTipo}`);
      }

      if (montoSena > montoTotal) {
        throw new BadRequestException('La seña no puede superar el monto total acordado');
      }

      if (montoSenaInput !== undefined && montoSenaInput !== null) {
        const preview = Number(montoSenaInput);
        if (preview !== montoSena) {
          throw new BadRequestException(
            `El monto_sena enviado (${preview}) no coincide con el cálculo del tipo (${senaTipo}) y valor (${senaValor}) especificados (${montoSena})`,
          );
        }
      }

      return {
        senaEleccion: 'personalizada',
        senaTipo,
        senaValor,
        senaOrigenGrupoId: null,
        montoSena,
      };
    }

    throw new BadRequestException(`Opción de seña no válida: ${senaEleccion}`);
  }

  async create(createAlquilerDto: CreateAlquilerDto, token: string, workspaceId: string) {
    const client = this.supabaseService.getClient(token);
    const unidadData = await this.validateUnidad(client, createAlquilerDto.unidad_id);

    // 0. Positive total check
    const montoTotal = Number(createAlquilerDto.monto_total || 0);
    if (montoTotal <= 0) {
      throw new BadRequestException('El monto total del alquiler debe ser mayor a 0');
    }

    // 1. Modality check: required, canonical, and offered by unit
    if (!createAlquilerDto.modalidad) {
      throw new BadRequestException('La modalidad de alquiler es obligatoria');
    }
    const rawMod = createAlquilerDto.modalidad;
    const modalidad = normalizeModality(rawMod);
    if (!modalidad) {
      throw new BadRequestException(`La modalidad de alquiler '${rawMod}' no es compatible ni soportada.`);
    }

    const activeModalidades = (unidadData.modalidades_precio || []).filter(
      (m: any) => !m.deleted_at && normalizeModality(m.unidad_tiempo) !== null,
    );
    if (activeModalidades.length === 0) {
      throw new BadRequestException('La unidad seleccionada no ofrece ninguna modalidad de alquiler válida');
    }
    const hasMatchingModality = activeModalidades.some(
      (m: any) => normalizeModality(m.unidad_tiempo) === modalidad,
    );
    if (!hasMatchingModality) {
      throw new BadRequestException(`La unidad no ofrece la modalidad de alquiler seleccionada (${modalidad})`);
    }

    // 2. Interval normalization & validation
    const { inicioAt, finAt, fechaInicioStr, fechaFinStr } = this.resolveIntervals(createAlquilerDto);

    // 3. Overlap check (rejects non-empty intersection, allows boundary adjacency, fails closed on query error)
    await this.checkOverlap(client, createAlquilerDto.unidad_id, inicioAt, finAt);

    // 4. Inquilino check
    const { data: inquilinoData, error: inquilinoError } = await client
      .from('inquilinos')
      .select('id')
      .eq('id', createAlquilerDto.inquilino_id)
      .is('deleted_at', null)
      .single();

    if (inquilinoError || !inquilinoData) {
      throw new NotFoundException('Inquilino no encontrado');
    }

    // 5. Seña Resolution (Authoritative server-side)
    const senaResolved = await this.resolveSena(
      client,
      unidadData,
      montoTotal,
      createAlquilerDto.sena_eleccion,
      createAlquilerDto.sena_tipo,
      createAlquilerDto.sena_valor,
      createAlquilerDto.monto_sena,
    );

    const estadoPago = createAlquilerDto.estado_pago || 'pendiente';
    const montoDeposito = Number(createAlquilerDto.monto_deposito || 0);
    let montoCobrado = Number(createAlquilerDto.monto_cobrado !== undefined ? createAlquilerDto.monto_cobrado : 0);

    if (createAlquilerDto.monto_cobrado === undefined) {
      if (estadoPago === 'cobrado_total') {
        montoCobrado = montoTotal;
      } else if (estadoPago === 'seña_cobrada') {
        montoCobrado = senaResolved.montoSena;
      } else {
        montoCobrado = 0;
      }
    }

    const { data, error } = await client
      .from('alquileres')
      .insert([
        {
          gestor_id: workspaceId,
          unidad_id: createAlquilerDto.unidad_id,
          inquilino_id: createAlquilerDto.inquilino_id,
          modalidad,
          inicio_at: inicioAt.toISOString(),
          fin_at: finAt.toISOString(),
          fecha_inicio: fechaInicioStr,
          fecha_fin: fechaFinStr,
          monto_total: montoTotal,
          sena_eleccion: senaResolved.senaEleccion,
          sena_tipo: senaResolved.senaTipo,
          sena_valor: senaResolved.senaValor,
          sena_origen_grupo_id: senaResolved.senaOrigenGrupoId,
          monto_sena: senaResolved.montoSena,
          monto_deposito: montoDeposito,
          estado_pago: estadoPago,
          monto_cobrado: montoCobrado,
          observaciones: createAlquilerDto.observaciones,
          contrato_url: createAlquilerDto.contrato_url,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      throw new UnprocessableEntityException(error?.message || 'Error al crear alquiler');
    }

    return data;
  }

  async findAll(token: string, limit = 10, offset = 0) {
    const client = this.supabaseService.getClient(token);

    const { data, error, count } = await client
      .from('alquileres')
      .select(
        `
        *,
        unidad:unidades(titulo_es),
        inquilino:inquilinos(nombre_completo)
      `,
        { count: 'exact' },
      )
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
      limit,
      offset,
    };
  }

  async findOne(id: string, token: string) {
    const client = this.supabaseService.getClient(token);
    const { data, error } = await client
      .from('alquileres')
      .select(
        `
        *,
        unidad:unidades(titulo_es),
        inquilino:inquilinos(nombre_completo)
      `,
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw new NotFoundException('Alquiler no encontrado');
    }
    return data;
  }

  async update(id: string, updateAlquilerDto: UpdateAlquilerDto, token: string) {
    const client = this.supabaseService.getClient(token);

    const { data: currentAlquiler, error: currentError } = await client
      .from('alquileres')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (currentError || !currentAlquiler) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    if (updateAlquilerDto.monto_total !== undefined && Number(updateAlquilerDto.monto_total) <= 0) {
      throw new BadRequestException('El monto total del alquiler debe ser mayor a 0');
    }

    const unidadId = updateAlquilerDto.unidad_id || currentAlquiler.unidad_id;
    const unidadData = await this.validateUnidad(client, unidadId);

    // Modality check: explicit validation on current or updated modality
    let modalidad: RentalModality;
    if (updateAlquilerDto.modalidad) {
      const normalized = normalizeModality(updateAlquilerDto.modalidad);
      if (!normalized) {
        throw new BadRequestException(`La modalidad de alquiler '${updateAlquilerDto.modalidad}' no es válida.`);
      }
      modalidad = normalized;
    } else {
      const currentNorm = normalizeModality(currentAlquiler.modalidad);
      if (!currentNorm) {
        throw new BadRequestException(`La modalidad actual del alquiler '${currentAlquiler.modalidad}' no es válida ni soportada.`);
      }
      modalidad = currentNorm;
    }

    const unidadChanged = Boolean(updateAlquilerDto.unidad_id && updateAlquilerDto.unidad_id !== currentAlquiler.unidad_id);
    const modalityChanged = Boolean(updateAlquilerDto.modalidad);

    if (unidadChanged || modalityChanged) {
      const activeModalidades = (unidadData.modalidades_precio || []).filter(
        (m: any) => !m.deleted_at && normalizeModality(m.unidad_tiempo) !== null,
      );
      if (activeModalidades.length === 0) {
        throw new BadRequestException('La unidad seleccionada no ofrece ninguna modalidad de alquiler válida');
      }
      const hasMatchingModality = activeModalidades.some(
        (m: any) => normalizeModality(m.unidad_tiempo) === modalidad,
      );
      if (!hasMatchingModality) {
        throw new BadRequestException(`La unidad no ofrece la modalidad de alquiler seleccionada (${modalidad})`);
      }
    }

    // Interval resolution
    let inicioAt: Date;
    let finAt: Date;
    let fechaInicioStr: string;
    let fechaFinStr: string;

    if (updateAlquilerDto.inicio_at || updateAlquilerDto.fin_at || updateAlquilerDto.fecha_inicio || updateAlquilerDto.fecha_fin) {
      const resolved = this.resolveIntervals({
        inicio_at: updateAlquilerDto.inicio_at || (updateAlquilerDto.fecha_inicio ? undefined : currentAlquiler.inicio_at),
        fin_at: updateAlquilerDto.fin_at || (updateAlquilerDto.fecha_fin ? undefined : currentAlquiler.fin_at),
        fecha_inicio: updateAlquilerDto.fecha_inicio || (updateAlquilerDto.inicio_at ? undefined : currentAlquiler.fecha_inicio ? new Date(currentAlquiler.fecha_inicio) : undefined),
        fecha_fin: updateAlquilerDto.fecha_fin || (updateAlquilerDto.fin_at ? undefined : currentAlquiler.fecha_fin ? new Date(currentAlquiler.fecha_fin) : undefined),
      });
      inicioAt = resolved.inicioAt;
      finAt = resolved.finAt;
      fechaInicioStr = resolved.fechaInicioStr;
      fechaFinStr = resolved.fechaFinStr;
    } else {
      inicioAt = currentAlquiler.inicio_at ? new Date(currentAlquiler.inicio_at) : new Date(currentAlquiler.fecha_inicio);
      finAt = currentAlquiler.fin_at ? new Date(currentAlquiler.fin_at) : new Date(currentAlquiler.fecha_fin);
      fechaInicioStr = getBuenosAiresCalendarDate(inicioAt);
      fechaFinStr = getBuenosAiresCalendarDate(
        finAt.getUTCHours() === 3 && finAt.getUTCMinutes() === 0 && finAt.getUTCSeconds() === 0
          ? new Date(finAt.getTime() - 1000)
          : finAt,
      );
    }

    // Overlap check (excluding self, fails closed on query error)
    await this.checkOverlap(client, unidadId, inicioAt, finAt, id);

    // Seña authoritative recomputation (never directly spread client input into storage)
    const montoTotal = updateAlquilerDto.monto_total !== undefined
      ? Number(updateAlquilerDto.monto_total)
      : Number(currentAlquiler.monto_total || 0);

    if (montoTotal <= 0) {
      throw new BadRequestException('El monto total del alquiler debe ser mayor a 0');
    }

    const senaEleccion = updateAlquilerDto.sena_eleccion ?? currentAlquiler.sena_eleccion;
    const senaTipo = updateAlquilerDto.sena_tipo ?? (updateAlquilerDto.sena_eleccion ? undefined : currentAlquiler.sena_tipo);
    const senaValor = updateAlquilerDto.sena_valor ?? (updateAlquilerDto.sena_eleccion ? undefined : currentAlquiler.sena_valor);
    const montoSena = updateAlquilerDto.monto_sena ?? (updateAlquilerDto.sena_eleccion ? undefined : currentAlquiler.monto_sena);

    const senaResolved = await this.resolveSena(
      client,
      unidadData,
      montoTotal,
      senaEleccion,
      senaTipo,
      senaValor,
      montoSena,
    );

    const estadoPago = updateAlquilerDto.estado_pago || currentAlquiler.estado_pago || 'pendiente';
    let montoCobrado = currentAlquiler.monto_cobrado;
    if (updateAlquilerDto.monto_cobrado !== undefined) {
      montoCobrado = Number(updateAlquilerDto.monto_cobrado);
    } else if (
      updateAlquilerDto.estado_pago !== undefined ||
      updateAlquilerDto.monto_total !== undefined ||
      updateAlquilerDto.sena_eleccion !== undefined
    ) {
      if (estadoPago === 'cobrado_total') {
        montoCobrado = montoTotal;
      } else if (estadoPago === 'seña_cobrada') {
        montoCobrado = senaResolved.montoSena;
      }
    }

    const updatePayload: Record<string, any> = {
      modalidad,
      inicio_at: inicioAt.toISOString(),
      fin_at: finAt.toISOString(),
      fecha_inicio: fechaInicioStr,
      fecha_fin: fechaFinStr,
      monto_total: montoTotal,
      sena_eleccion: senaResolved.senaEleccion,
      sena_tipo: senaResolved.senaTipo,
      sena_valor: senaResolved.senaValor,
      sena_origen_grupo_id: senaResolved.senaOrigenGrupoId,
      monto_sena: senaResolved.montoSena,
      estado_pago: estadoPago,
      monto_cobrado: montoCobrado,
    };

    if (updateAlquilerDto.inquilino_id !== undefined) updatePayload.inquilino_id = updateAlquilerDto.inquilino_id;
    if (updateAlquilerDto.unidad_id !== undefined) updatePayload.unidad_id = updateAlquilerDto.unidad_id;
    if (updateAlquilerDto.monto_deposito !== undefined) updatePayload.monto_deposito = Number(updateAlquilerDto.monto_deposito);
    if (updateAlquilerDto.estado !== undefined) updatePayload.estado = updateAlquilerDto.estado;
    if (updateAlquilerDto.observaciones !== undefined) updatePayload.observaciones = updateAlquilerDto.observaciones;
    if (updateAlquilerDto.contrato_url !== undefined) updatePayload.contrato_url = updateAlquilerDto.contrato_url;

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

    const { error } = await client
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
