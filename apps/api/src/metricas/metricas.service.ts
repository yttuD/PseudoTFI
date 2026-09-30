import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { GetMetricasDto } from './dto/get-metricas.dto.js';
import { AuthenticatedUser } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from '../authorization/authorization.service.js';

export interface MetricasResponse {
  puede_ver_financiero: boolean;
  resumen: {
    total_vistas: number;
    total_contactos: number;
    tasa_conversion_general: number;
    unidades_activas: number;
    tasa_ocupacion: number;
    ingresos_totales: number | null;
    ingresos_mes_actual: number | null;
    ingresos_pendientes_cobro: number | null;
    fondos_en_custodia: number | null;
  };
  serie_temporal: Array<{
    fecha: string;
    vistas: number;
    contactos: number;
    facturacion: number | null;
    conversion: number;
  }>;
  rendimiento_unidades: Array<{
    id: string;
    titulo: string;
    categoria: string;
    vistas: number;
    contactos: number;
    ratio_conversion: number;
    estado: string;
  }>;
  distribucion_ocupacion: Array<{
    categoria: string;
    total: number;
    alquiladas: number;
    tasa: number;
  }>;
  financiero: {
    ingresos_totales: number;
    ingresos_mes_actual: number;
    ingresos_pendientes_cobro: number;
    fondos_en_custodia: number;
    ingresos_por_categoria: Array<{
      categoria: string;
      monto: number;
    }>;
  } | null;
}

@Injectable()
export class MetricasService {
  private readonly logger = new Logger(MetricasService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly authzService: AuthorizationService,
  ) {}

  async getMetricas(
    dto: GetMetricasDto,
    actor: AuthenticatedUser,
    token?: string,
  ): Promise<MetricasResponse> {
    const workspaceId = actor.workspace_id || actor.id;
    const userRole = actor.rol || 'gestor';
    const puedeVerFinanciero = userRole === 'gestor';

    // 1. Resolver conjunto de fechas objetivo
    const fechasObjetivo = this.resolverFechasObjetivo(dto);

    const supabase = token
      ? this.supabaseService.getClient(token)
      : this.supabaseService.getAdminClient();

    let unidades: any[] = [];
    let vistasRaw: Array<{ id: string; unidad_id: string; created_at: string }> = [];
    let contactosRaw: Array<{ id: string; unidad_id: string; created_at: string }> = [];
    let alquileres: any[] = [];

    try {
      // 2. Obtener unidades del workspace desde Supabase
      const { data: dbUnidades, error: uErr } = await supabase
        .from('unidades')
        .select('id, titulo_es, categoria, estado, zona_id, created_at')
        .eq('gestor_id', workspaceId)
        .is('deleted_at', null);

      if (uErr) {
        this.logger.error(`Error al consultar unidades en metricas: ${uErr.message}`);
        throw new ServiceUnavailableException(`Error al consultar unidades: ${uErr.message}`);
      }
      unidades = dbUnidades || [];

      // Scoped filtering for Delegado
      if (userRole === 'delegado') {
        const allowed = [];
        for (const u of unidades) {
          if (await this.authzService.canReadUnidad(actor, u.id)) {
            allowed.push(u);
          }
        }
        unidades = allowed;
      }

      // Filtros secundarios
      if (dto.unidad_id) {
        unidades = unidades.filter((u) => u.id === dto.unidad_id);
      }
      if (dto.zona_id) {
        unidades = unidades.filter((u) => String(u.zona_id) === dto.zona_id);
      }

      const unidadIds = unidades.map((u) => u.id);

      // 3. Obtener vistas y contactos para las unidades en alcance
      if (unidadIds.length > 0) {
        const { data: dbVistas, error: vErr } = await supabase
          .from('vistas_unidades')
          .select('id, unidad_id, created_at')
          .in('unidad_id', unidadIds);

        if (vErr) {
          this.logger.error(`Error al consultar vistas en metricas: ${vErr.message}`);
        } else {
          vistasRaw = dbVistas || [];
        }

        const { data: dbContactos, error: cErr } = await supabase
          .from('contactos_whatsapp')
          .select('id, unidad_id, created_at')
          .in('unidad_id', unidadIds);

        if (cErr) {
          this.logger.error(`Error al consultar contactos en metricas: ${cErr.message}`);
        } else {
          contactosRaw = dbContactos || [];
        }
      }

      // 4. Obtener alquileres si el rol tiene permiso financiero
      if (puedeVerFinanciero) {
        const { data: dbAlquileres, error: aErr } = await supabase
          .from('alquileres')
          .select('id, unidad_id, monto_total, monto_sena, monto_deposito, estado_pago, monto_cobrado, created_at')
          .eq('gestor_id', workspaceId)
          .is('deleted_at', null);

        if (aErr) {
          this.logger.error(`Error al consultar alquileres en metricas: ${aErr.message}`);
        } else {
          alquileres = dbAlquileres || [];
        }
      }
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Error inesperado consultando metricas privadas: ${err?.message || err}`);
      throw new ServiceUnavailableException('Error al consultar métricas del workspace');
    }

    // 5. Zero-Filling estricto para cada fecha solicitada
    const temporalMap = new Map<
      string,
      { vistas: number; contactos: number; facturacion: number }
    >();

    for (const f of fechasObjetivo) {
      temporalMap.set(f, { vistas: 0, contactos: 0, facturacion: 0 });
    }

    // Acumular vistas en fechas objetivo
    let totalVistas = 0;
    for (const v of vistasRaw) {
      const f = v.created_at ? v.created_at.substring(0, 10) : '';
      if (temporalMap.has(f)) {
        temporalMap.get(f)!.vistas += 1;
        totalVistas++;
      }
    }

    // Acumular contactos en fechas objetivo
    let totalContactos = 0;
    for (const c of contactosRaw) {
      const f = c.created_at ? c.created_at.substring(0, 10) : '';
      if (temporalMap.has(f)) {
        temporalMap.get(f)!.contactos += 1;
        totalContactos++;
      }
    }

    // Acumular facturación de alquileres según Criterio de Caja Real (solo si gestor)
    let ingresosTotales = 0;
    let ingresosMesActual = 0;
    let ingresosPendientesCobro = 0;
    let fondosEnCustodia = 0;
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);

    if (puedeVerFinanciero) {
      for (const a of alquileres) {
        const fechaCreacion = a.created_at ? a.created_at.substring(0, 10) : '';
        const percibido = Number(
          a.monto_cobrado !== undefined
            ? a.monto_cobrado
            : (a.estado_pago === 'cobrado_total' ? a.monto_total : (a.estado_pago === 'seña_cobrada' ? (a.monto_sena || 0) : (a.monto_total || 0)))
        );
        const totalContrato = Number(a.monto_total || 0);
        const deposito = Number(a.monto_deposito || 0);

        if (temporalMap.has(fechaCreacion)) {
          temporalMap.get(fechaCreacion)!.facturacion += percibido;
        }
        ingresosTotales += percibido;
        if (fechaCreacion.startsWith(currentMonthPrefix)) {
          ingresosMesActual += percibido;
        }
        ingresosPendientesCobro += Math.max(0, totalContrato - percibido);
        fondosEnCustodia += deposito;
      }
    }

    // Convertir serie temporal a array ordenado
    const serieTemporal = fechasObjetivo.map((fecha) => {
      const data = temporalMap.get(fecha)!;
      const conversion =
        data.vistas > 0 ? Number(((data.contactos / data.vistas) * 100).toFixed(1)) : 0;

      return {
        fecha,
        vistas: data.vistas,
        contactos: data.contactos,
        facturacion: puedeVerFinanciero ? data.facturacion : null,
        conversion,
      };
    });

    // 6. Métricas por unidad
    const rendimientoUnidades = unidades.map((u) => {
      const uVistas = vistasRaw.filter((v) => v.unidad_id === u.id).length;
      const uContactos = contactosRaw.filter((c) => c.unidad_id === u.id).length;
      const ratio =
        uVistas > 0 ? Number(((uContactos / uVistas) * 100).toFixed(1)) : 0;

      return {
        id: u.id,
        titulo: u.titulo_es || 'Unidad sin título',
        categoria: u.categoria || 'departamento',
        vistas: uVistas,
        contactos: uContactos,
        ratio_conversion: ratio,
        estado: u.estado,
      };
    });

    // 7. Distribución de ocupación por categoría
    const categoriasMap = new Map<
      string,
      { total: number; alquiladas: number; facturacion: number }
    >();

    for (const u of unidades) {
      const cat = u.categoria || 'otro';
      if (!categoriasMap.has(cat)) {
        categoriasMap.set(cat, { total: 0, alquiladas: 0, facturacion: 0 });
      }
      const entry = categoriasMap.get(cat)!;
      entry.total += 1;
      if (u.estado === 'alquilada') {
        entry.alquiladas += 1;
      }
    }

    if (puedeVerFinanciero) {
      for (const a of alquileres) {
        const u = unidades.find((item) => item.id === a.unidad_id);
        if (u) {
          const cat = u.categoria || 'otro';
          const percibido = Number(
            a.monto_cobrado !== undefined
              ? a.monto_cobrado
              : (a.estado_pago === 'cobrado_total' ? a.monto_total : (a.estado_pago === 'seña_cobrada' ? (a.monto_sena || 0) : (a.monto_total || 0)))
          );
          if (categoriasMap.has(cat)) {
            categoriasMap.get(cat)!.facturacion += percibido;
          }
        }
      }
    }

    const distribucionOcupacion: Array<{
      categoria: string;
      total: number;
      alquiladas: number;
      tasa: number;
    }> = [];

    const ingresosPorCategoria: Array<{
      categoria: string;
      monto: number;
    }> = [];

    categoriasMap.forEach((val, cat) => {
      distribucionOcupacion.push({
        categoria: cat,
        total: val.total,
        alquiladas: val.alquiladas,
        tasa: val.total > 0 ? Number(((val.alquiladas / val.total) * 100).toFixed(1)) : 0,
      });

      if (puedeVerFinanciero) {
        ingresosPorCategoria.push({
          categoria: cat,
          monto: val.facturacion,
        });
      }
    });

    // 8. Resumen y KPIs
    const totalUnidades = unidades.length;
    const unidadesAlquiladas = unidades.filter((u) => u.estado === 'alquilada').length;
    const tasaOcupacion =
      totalUnidades > 0
        ? Number(((unidadesAlquiladas / totalUnidades) * 100).toFixed(1)) : 0;

    const tasaConversionGeneral =
      totalVistas > 0
        ? Number(((totalContactos / totalVistas) * 100).toFixed(1)) : 0;

    const financieroPayload = puedeVerFinanciero
      ? {
          ingresos_totales: ingresosTotales,
          ingresos_mes_actual: ingresosMesActual,
          ingresos_pendientes_cobro: ingresosPendientesCobro,
          fondos_en_custodia: fondosEnCustodia,
          ingresos_por_categoria: ingresosPorCategoria,
        }
      : null;

    return {
      puede_ver_financiero: puedeVerFinanciero,
      resumen: {
        total_vistas: totalVistas,
        total_contactos: totalContactos,
        tasa_conversion_general: tasaConversionGeneral,
        unidades_activas: totalUnidades,
        tasa_ocupacion: tasaOcupacion,
        ingresos_totales: puedeVerFinanciero ? ingresosTotales : null,
        ingresos_mes_actual: puedeVerFinanciero ? ingresosMesActual : null,
        ingresos_pendientes_cobro: puedeVerFinanciero
          ? ingresosPendientesCobro
          : null,
        fondos_en_custodia: puedeVerFinanciero ? fondosEnCustodia : null,
      },
      serie_temporal: serieTemporal,
      rendimiento_unidades: rendimientoUnidades,
      distribucion_ocupacion: distribucionOcupacion,
      financiero: financieroPayload,
    };
  }

  private resolverFechasObjetivo(dto: GetMetricasDto): string[] {
    if (dto.dias && dto.dias.includes(',')) {
      return dto.dias
        .split(',')
        .map((d) => d.trim())
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();
    }

    if (dto.dias && !isNaN(Number(dto.dias))) {
      const count = Math.min(Math.max(Number(dto.dias), 1), 365);
      return this.generarRangoDias(count);
    }

    if (dto.fecha_desde && dto.fecha_hasta) {
      const start = new Date(dto.fecha_desde);
      const end = new Date(dto.fecha_hasta);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
        const fechas: string[] = [];
        const curr = new Date(start);
        while (curr <= end) {
          fechas.push(curr.toISOString().substring(0, 10));
          curr.setDate(curr.getDate() + 1);
        }
        return fechas;
      }
    }

    return this.generarRangoDias(30);
  }

  private generarRangoDias(dias: number): string[] {
    const fechas: string[] = [];
    const now = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      fechas.push(d.toISOString().substring(0, 10));
    }
    return fechas;
  }
}
