import { Injectable, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { CreateReporteDto } from './dto/create-reporte.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class ReportesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createReporteDto: CreateReporteDto, token: string) {
    const client = this.supabaseService.getClient(token.replace('Bearer ', ''));
    const { data: user } = await client.auth.getUser();

    // Validar que la Unidad esté en estado publicada
    const { data: unidad, error: errorUnidad } = await client
      .from('unidades')
      .select('estado')
      .eq('id', createReporteDto.unidad_id)
      .single();
      
    if (errorUnidad || !unidad) throw new BadRequestException('Unidad no encontrada');
    if (unidad.estado !== 'publicada') throw new BadRequestException('Solo se pueden reportar unidades publicadas');

    const { error } = await client.from('reportes').insert({
      unidad_id: createReporteDto.unidad_id,
      usuario_id: user.user!.id,
      motivo: createReporteDto.motivo
    });

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya has reportado esta unidad');
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
