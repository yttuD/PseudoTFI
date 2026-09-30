import { Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { BuscarUnidadesDto } from './dto/buscar-unidades.dto.js';
import { resilientStore } from '../common/resilient-store.js';
import { createHash } from 'node:crypto';
import { isReleaseRuntime } from '../config/release-readiness.js';

const databaseUnavailable = () => new ServiceUnavailableException('El catálogo no está disponible temporalmente');
const queryTimeoutMs = () => isReleaseRuntime() ? 5000 : 400;

function hashIp(ip: string): string {
  const salt = 'rendo-analytics-salt-2026';
  return createHash('sha256').update(`${salt}-${ip}`).digest('hex');
}

async function withFastTimeout(promise: any, ms: number = 400): Promise<any> {
  let timer: any;
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    const res = await Promise.race([Promise.resolve(promise), timeoutPromise]);
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

@Injectable()
export class MarketplaceService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(query: BuscarUnidadesDto) {
    const { page = 1, limit = 20, locale = 'es', q, zona_id, categoria, precio_min, precio_max, capacidad } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const isOnline = await this.supabaseService.isOnline();
    if (!isOnline) {
      if (isReleaseRuntime()) throw databaseUnavailable();
      let fallbackUnidades = resilientStore.getUnidades(true);
      
      if (categoria) {
        fallbackUnidades = fallbackUnidades.filter((u) => u.categoria?.toLowerCase() === categoria.toLowerCase());
      }
      if (zona_id) {
        fallbackUnidades = fallbackUnidades.filter((u) => Number(u.zona_id) === Number(zona_id));
      }
      if (q) {
        const qLower = q.toLowerCase();
        fallbackUnidades = fallbackUnidades.filter(
          (u) =>
            (u.titulo_es && u.titulo_es.toLowerCase().includes(qLower)) ||
            ((u as any).descripcion_es && (u as any).descripcion_es.toLowerCase().includes(qLower))
        );
      }
      if (precio_min !== undefined || precio_max !== undefined) {
        fallbackUnidades = fallbackUnidades.filter((u) => {
          const precio = u.modalidades_precio?.[0]?.precio || 0;
          if (precio_min !== undefined && precio < precio_min) return false;
          if (precio_max !== undefined && precio > precio_max) return false;
          return true;
        });
      }

      const mapped = fallbackUnidades.map((item) => {
        const titulo = (item as any)[`titulo_${locale}`] || item.titulo_es;
        return {
          id: item.id,
          titulo: titulo || null,
          categoria: item.categoria,
          zona_id: item.zona_id,
          fotos: item.fotos,
          ubicacion_aprox: item.ubicacion_aprox,
          created_at: item.created_at,
          ubicacion_exacta: null,
          modalidades_precio: item.modalidades_precio,
        };
      });
      return { data: mapped, count: mapped.length, page, limit };
    }

    // Public responses are projected below; service role permits server-side filters
    // without granting anonymous clients private unit columns in Supabase.
    const supabase = this.supabaseService.getAdminClient();
    let queryBuilder = supabase
      .from('unidades')
      .select(`
        id, 
        titulo_es,
        titulo_pt,
        titulo_en,
        categoria, 
        zona_id, 
        fotos, 
        ubicacion_aprox, 
        created_at,
        zonas(nombre),
        modalidades_precio(id, unidad_tiempo, cantidad_tiempo, precio, deleted_at)
      `, { count: 'exact' })
      .eq('estado', 'publicada')
      .is('deleted_at', null)
      .is('modalidades_precio.deleted_at', null);

    if (zona_id) queryBuilder = queryBuilder.eq('zona_id', zona_id);
    if (categoria) queryBuilder = queryBuilder.eq('categoria', categoria);
    
    if (capacidad) {
      queryBuilder = queryBuilder.gte('atributos->>capacidad', capacidad);
    }

    if (q) {
      queryBuilder = queryBuilder.ilike(`titulo_${locale}`, `%${q}%`);
    }

    if (precio_min !== undefined || precio_max !== undefined) {
      let precioQuery = supabase
        .from('modalidades_precio')
        .select('unidad_id')
        .is('deleted_at', null);
      
      if (precio_min !== undefined) precioQuery = precioQuery.gte('precio', precio_min);
      if (precio_max !== undefined) precioQuery = precioQuery.lte('precio', precio_max);

      const modalidadesRes = await withFastTimeout(precioQuery, queryTimeoutMs());
      if (isReleaseRuntime() && (!modalidadesRes || modalidadesRes.error)) throw databaseUnavailable();
      const modalidadesData = modalidadesRes?.data || [];
      const unidadIdsConPrecioValido = modalidadesData.map((m: any) => m.unidad_id);
      if (unidadIdsConPrecioValido.length === 0) return { data: [], count: 0, page, limit };
      
      if (unidadIdsConPrecioValido.length > 0) {
        queryBuilder = queryBuilder.in('id', unidadIdsConPrecioValido);
      }
    }

    let data: any[] | null = null;
    let error: any = null;
    let count: number | null = 0;

    try {
      const queryPromise = queryBuilder
        .range(from, to)
        .order('created_at', { ascending: false });
      const result = await withFastTimeout(queryPromise, queryTimeoutMs());
      data = result?.data || null;
      error = result?.error || null;
      count = result?.count || 0;
    } catch (err: any) {
      error = err;
    }

    if (error || !data) {
      if (isReleaseRuntime()) throw databaseUnavailable();
      let fallbackUnidades = resilientStore.getUnidades(true);
      
      if (categoria) {
        fallbackUnidades = fallbackUnidades.filter((u) => u.categoria?.toLowerCase() === categoria.toLowerCase());
      }
      if (zona_id) {
        fallbackUnidades = fallbackUnidades.filter((u) => Number(u.zona_id) === Number(zona_id));
      }
      if (q) {
        const qLower = q.toLowerCase();
        fallbackUnidades = fallbackUnidades.filter(
          (u) =>
            (u.titulo_es && u.titulo_es.toLowerCase().includes(qLower)) ||
            ((u as any).descripcion_es && (u as any).descripcion_es.toLowerCase().includes(qLower))
        );
      }
      if (precio_min !== undefined || precio_max !== undefined) {
        fallbackUnidades = fallbackUnidades.filter((u) => {
          const precio = u.modalidades_precio?.[0]?.precio || 0;
          if (precio_min !== undefined && precio < precio_min) return false;
          if (precio_max !== undefined && precio > precio_max) return false;
          return true;
        });
      }

      const mapped = fallbackUnidades.map((item) => {
        const titulo = (item as any)[`titulo_${locale}`] || item.titulo_es;
        return {
          id: item.id,
          titulo: titulo || null,
          categoria: item.categoria,
          zona_id: item.zona_id,
          fotos: item.fotos,
          ubicacion_aprox: item.ubicacion_aprox,
          created_at: item.created_at,
          ubicacion_exacta: null,
          modalidades_precio: item.modalidades_precio,
        };
      });
      return { data: mapped, count: mapped.length, page, limit };
    }

    const mappedData = data.map((item: any) => {
      return {
        id: item.id,
        titulo: item[`titulo_${locale}`] || item.titulo_es || null,
        categoria: item.categoria,
        zona_id: item.zona_id,
        zonas: item.zonas || null,
        fotos: item.fotos || [],
        ubicacion_aprox: item.ubicacion_aprox || null,
        created_at: item.created_at,
        modalidades_precio: (item.modalidades_precio || [])
          .filter((m: any) => !m.deleted_at)
          .map((m: any) => ({ id: m.id, unidad_tiempo: m.unidad_tiempo, cantidad_tiempo: m.cantidad_tiempo, precio: m.precio })),
      };
    });

    return { data: mappedData, count, page, limit };
  }

  async findOne(id: string, isAuthenticated: boolean, locale: string = 'es') {
    const isOnline = await this.supabaseService.isOnline();
    if (!isOnline) {
      if (isReleaseRuntime()) throw databaseUnavailable();
      const fallback = resilientStore.getUnidadById(id);
      if (fallback && fallback.estado === 'publicada') {
        const titulo = (fallback as any)[`titulo_${locale}`] || fallback.titulo_es;
        const descripcion = (fallback as any)[`descripcion_${locale}`] || fallback.descripcion_es;
        return {
          ...fallback,
          titulo: titulo || null,
          descripcion: descripcion || null,
          ubicacion_exacta: isAuthenticated ? fallback.ubicacion_exacta : null,
          whatsapp: isAuthenticated ? fallback.whatsapp : null,
          telefono: isAuthenticated ? (fallback as any).telefono || null : null,
        };
      }
      throw new NotFoundException('Unidad no encontrada o no publicada');
    }

    let data: any = null;
    let error: any = null;

    try {
      const supabase = this.supabaseService.getAdminClient();
      const queryPromise = supabase
        .from('unidades')
        .select('*, zonas(nombre), modalidades_precio(id, unidad_tiempo, cantidad_tiempo, precio, deleted_at)')
        .eq('id', id)
        .eq('estado', 'publicada')
        .is('deleted_at', null)
        .single();
      const result = await withFastTimeout(queryPromise, queryTimeoutMs());
      data = result?.data || null;
      error = result?.error || null;
    } catch (err: any) {
      error = err;
    }

    if (error || !data) {
      if (isReleaseRuntime()) {
        if (error?.code === 'PGRST116') throw new NotFoundException('Unidad no encontrada o no publicada');
        throw databaseUnavailable();
      }
      const fallback = resilientStore.getUnidadById(id);
      if (fallback && fallback.estado === 'publicada') {
        const titulo = (fallback as any)[`titulo_${locale}`] || fallback.titulo_es;
        const descripcion = (fallback as any)[`descripcion_${locale}`] || fallback.descripcion_es;
        return {
          ...fallback,
          titulo: titulo || null,
          descripcion: descripcion || null,
          ubicacion_exacta: isAuthenticated ? fallback.ubicacion_exacta : null,
          whatsapp: isAuthenticated ? fallback.whatsapp : null,
          telefono: isAuthenticated ? (fallback as any).telefono || null : null,
        };
      }
      throw new NotFoundException('Unidad no encontrada o no publicada');
    }

    const titulo = data[`titulo_${locale}`] || data.titulo_es;
    const descripcion = data[`descripcion_${locale}`] || data.descripcion_es;
    return {
      id: data.id,
      titulo: titulo || null,
      descripcion: descripcion || null,
      categoria: data.categoria,
      zona_id: data.zona_id,
      zonas: data.zonas || null,
      fotos: data.fotos || [],
      ubicacion_aprox: data.ubicacion_aprox || null,
      ubicacion_exacta: isAuthenticated ? data.ubicacion_exacta || null : null,
      whatsapp: isAuthenticated ? data.whatsapp || null : null,
      caracteristicas: data.atributos || {},
      modalidades_precio: (data.modalidades_precio || [])
        .filter((m: any) => !m.deleted_at)
        .map((m: any) => ({ id: m.id, unidad_tiempo: m.unidad_tiempo, cantidad_tiempo: m.cantidad_tiempo, precio: m.precio })),
    };
  }

  async getZonas() {
    const isOnline = await this.supabaseService.isOnline();
    if (!isOnline) {
      if (isReleaseRuntime()) throw databaseUnavailable();
      return [
        {
          id: 1,
          nombre: 'Goya',
          provincia: 'Corrientes',
          zonas: [
            { id: 1, nombre: 'Centro' },
            { id: 2, nombre: 'Costanera' },
            { id: 3, nombre: 'Norte' },
            { id: 4, nombre: 'Sur' },
          ],
        },
      ];
    }

    try {
      const supabase = this.supabaseService.getClient();
      const queryPromise = supabase
        .from('ciudades')
        .select(`
          id, 
          nombre, 
          provincia,
          zonas (
            id,
            nombre
          )
        `);
      const result = await withFastTimeout(queryPromise, queryTimeoutMs());
      if (result && !result.error && result.data) return result.data;
    } catch {}

    if (isReleaseRuntime()) throw databaseUnavailable();

    return [
      {
        id: 1,
        nombre: 'Goya',
        provincia: 'Corrientes',
        zonas: [
          { id: 1, nombre: 'Centro' },
          { id: 2, nombre: 'Costanera' },
          { id: 3, nombre: 'Norte' },
          { id: 4, nombre: 'Sur' },
        ],
      },
    ];
  }

  async registrarVista(unidadId: string, ip: string) {
    const ipHash = hashIp(ip || '127.0.0.1');
    const isOnline = await this.supabaseService.isOnline();
    if (!isOnline) {
      if (isReleaseRuntime()) throw databaseUnavailable();
      resilientStore.addVista(unidadId, ipHash);
      return { ok: true };
    }
    try {
      const supabase = this.supabaseService.getClient();
      const { error } = await supabase.from('vistas_unidades').insert({
        unidad_id: unidadId,
        ip_hash: ipHash,
      });
      if (error && isReleaseRuntime()) throw databaseUnavailable();
    } catch {
      if (isReleaseRuntime()) throw databaseUnavailable();
      resilientStore.addVista(unidadId, ipHash);
    }
    return { ok: true };
  }

  async registrarContacto(unidadId: string, ip?: string) {
    const ipHash = ip ? hashIp(ip) : undefined;
    const isOnline = await this.supabaseService.isOnline();
    if (!isOnline) {
      if (isReleaseRuntime()) throw databaseUnavailable();
      resilientStore.addContacto(unidadId, ipHash);
      return { ok: true };
    }
    try {
      const supabase = this.supabaseService.getClient();
      const { error } = await supabase.from('contactos_whatsapp').insert({
        unidad_id: unidadId,
        ip_hash: ipHash || null,
      });
      if (error && isReleaseRuntime()) throw databaseUnavailable();
    } catch {
      if (isReleaseRuntime()) throw databaseUnavailable();
      resilientStore.addContacto(unidadId, ipHash);
    }
    return { ok: true };
  }
}
