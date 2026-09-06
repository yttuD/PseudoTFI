import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { CreateFavoritoDto } from './dto/create-favorito.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class FavoritosService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createFavoritoDto: CreateFavoritoDto, token: string) {
    const client = this.supabaseService.getClient(token.replace('Bearer ', ''));
    const { data: user } = await client.auth.getUser();

    const { error } = await client.from('favoritos').insert({
      unidad_id: createFavoritoDto.unidad_id,
      usuario_id: user.user!.id
    });

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('La unidad ya está en favoritos');
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(token: string) {
    const client = this.supabaseService.getClient(token.replace('Bearer ', ''));
    const { data, error } = await client
      .from('favoritos')
      .select('..., unidades(*)');

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async remove(unidad_id: string, token: string) {
    const client = this.supabaseService.getClient(token.replace('Bearer ', ''));
    const { data: user } = await client.auth.getUser();
    
    const { error } = await client
      .from('favoritos')
      .delete()
      .match({ unidad_id: unidad_id, usuario_id: user.user!.id });

    if (error) throw new InternalServerErrorException(error.message);
  }
}
