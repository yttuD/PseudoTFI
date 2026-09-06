import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { BuscarUnidadesDto } from './dto/buscar-unidades.dto.js';

@Injectable()
export class MarketplaceService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(query: BuscarUnidadesDto) {
    const supabase = this.supabaseService.getClient();

    const { page = 1, limit = 20, locale = 'es', q, zona_id, categoria, precio_min, precio_max, capacidad } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = supabase
      .from('unidades')
      .select(`
        id, 
        titulo_${locale}, 
        categoria, 
        zona_id, 
        fotos, 
        ubicacion_aprox, 
        whatsapp,
        created_at
      `, { count: 'exact' })
      .eq('estado', 'publicada')
      .is('deleted_at', null);

    if (zona_id) queryBuilder = queryBuilder.eq('zona_id', zona_id);
    if (categoria) queryBuilder = queryBuilder.eq('categoria', categoria);
    
    if (capacidad) {
      queryBuilder = queryBuilder.gte('atributos->>capacidad', capacidad);
    }

    if (q) {
      queryBuilder = queryBuilder.textSearch(`titulo_${locale}`, q, { type: 'websearch', config: 'spanish' });
    }

    if (precio_min !== undefined || precio_max !== undefined) {
      let precioQuery = supabase
        .from('modalidades_precio')
        .select('unidad_id')
        .is('deleted_at', null);
      
      if (precio_min !== undefined) precioQuery = precioQuery.gte('precio', precio_min);
      if (precio_max !== undefined) precioQuery = precioQuery.lte('precio', precio_max);

      const { data: modalidadesData, error: modalidadesError } = await precioQuery;
      if (modalidadesError) throw new UnprocessableEntityException(modalidadesError.message);
      
      const unidadIdsConPrecioValido = modalidadesData.map(m => m.unidad_id);
      
      if (unidadIdsConPrecioValido.length === 0) {
         return { data: [], count: 0, page, limit };
      }
      queryBuilder = queryBuilder.in('id', unidadIdsConPrecioValido);
    }

    const { data, error, count } = await queryBuilder
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }

    const mappedData = data.map((item: any) => {
      const { [`titulo_${locale}`]: titulo, ...rest } = item;
      return {
        ...rest,
        titulo: titulo || null,
        ubicacion_exacta: null,
      };
    });

    return { data: mappedData, count, page, limit };
  }

  async findOne(id: string, isAuthenticated: boolean, locale: string = 'es') {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .eq('id', id)
      .eq('estado', 'publicada')
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw new NotFoundException('Unidad no encontrada o no publicada');
    }

    const { [`titulo_${locale}`]: titulo, [`descripcion_${locale}`]: descripcion, ...rest } = data;
    
    if (!isAuthenticated) {
      rest.ubicacion_exacta = null;
    }

    return {
      ...rest,
      titulo: titulo || null,
      descripcion: descripcion || null,
    };
  }

  async getZonas() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
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
      
    if (error) throw new UnprocessableEntityException(error.message);
    return data;
  }
}
