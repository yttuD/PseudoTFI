import { Injectable, InternalServerErrorException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { CreateFavoritoDto } from './dto/create-favorito.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { resilientStore } from '../common/resilient-store.js';
import { isReleaseRuntime } from '../config/release-readiness.js';

const unavailable = () => new ServiceUnavailableException('Favoritos no disponibles temporalmente');

@Injectable()
export class FavoritosService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createFavoritoDto: CreateFavoritoDto, token?: string, userId?: string) {
    let resolvedUserId = userId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = null;

    if (token) {
      const cleanToken = token.replace('Bearer ', '').trim();
      if (cleanToken && cleanToken !== 'null' && cleanToken !== 'undefined') {
        client = this.supabaseService.getClient(cleanToken);
        if (!resolvedUserId) {
          try {
            const { data: user } = await client.auth.getUser();
            resolvedUserId = user?.user?.id;
          } catch {
            // ignore
          }
        }
      }
    }

    if (!resolvedUserId) {
      if (isReleaseRuntime()) throw new UnauthorizedException('Se requiere una sesión válida');
      resolvedUserId = '22222222-2222-2222-2222-222222222222';
    }
    if (isReleaseRuntime() && !client) throw new UnauthorizedException('Se requiere una sesión válida');

    if (client) {
      try {
        const isOnline = await this.supabaseService.isOnline();
        if (isOnline) {
          const { error } = await client.from('favoritos').insert({
            unidad_id: createFavoritoDto.unidad_id,
            usuario_id: resolvedUserId,
          });

          if (error) {
            if (error.code === '23505') {
              return { ok: true, alreadyExists: true };
            }
            throw new InternalServerErrorException(error.message);
          }
          return { ok: true, alreadyExists: false };
        }
      } catch (err: unknown) {
        if (err instanceof InternalServerErrorException) throw err;
        if (isReleaseRuntime()) throw unavailable();
      }
    }

    if (isReleaseRuntime()) throw unavailable();

    return resilientStore.addFavorito(resolvedUserId, createFavoritoDto.unidad_id);
  }

  async findAll(token?: string, userId?: string) {
    let resolvedUserId = userId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = null;

    if (token) {
      const cleanToken = token.replace('Bearer ', '').trim();
      if (cleanToken && cleanToken !== 'null' && cleanToken !== 'undefined') {
        client = this.supabaseService.getClient(cleanToken);
        if (!resolvedUserId) {
          try {
            const { data: user } = await client.auth.getUser();
            resolvedUserId = user?.user?.id;
          } catch {
            // ignore
          }
        }
      }
    }

    if (!resolvedUserId) {
      if (isReleaseRuntime()) throw new UnauthorizedException('Se requiere una sesión válida');
      resolvedUserId = '22222222-2222-2222-2222-222222222222';
    }
    if (isReleaseRuntime() && !client) throw new UnauthorizedException('Se requiere una sesión válida');

    if (client) {
      try {
        const isOnline = await this.supabaseService.isOnline();
        if (isOnline) {
          const { data, error } = await client
            .from('favoritos')
            .select('unidad_id, unidades(*)')
            .eq('usuario_id', resolvedUserId);

          if (error) throw new InternalServerErrorException(error.message);
          if (Array.isArray(data)) {
            // Unpack full unit objects so frontend can render cards directly
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.map((item: any) => item.unidades || item).filter(Boolean);
          }
          return [];
        }
      } catch (err: unknown) {
        if (err instanceof InternalServerErrorException) throw err;
        if (isReleaseRuntime()) throw unavailable();
      }
    }

    if (isReleaseRuntime()) throw unavailable();

    return resilientStore.getFavoritos(resolvedUserId);
  }

  async remove(unidad_id: string, token?: string, userId?: string) {
    let resolvedUserId = userId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = null;

    if (token) {
      const cleanToken = token.replace('Bearer ', '').trim();
      if (cleanToken && cleanToken !== 'null' && cleanToken !== 'undefined') {
        client = this.supabaseService.getClient(cleanToken);
        if (!resolvedUserId) {
          try {
            const { data: user } = await client.auth.getUser();
            resolvedUserId = user?.user?.id;
          } catch {
            // ignore
          }
        }
      }
    }

    if (!resolvedUserId) {
      if (isReleaseRuntime()) throw new UnauthorizedException('Se requiere una sesión válida');
      resolvedUserId = '22222222-2222-2222-2222-222222222222';
    }
    if (isReleaseRuntime() && !client) throw new UnauthorizedException('Se requiere una sesión válida');

    if (client) {
      try {
        const isOnline = await this.supabaseService.isOnline();
        if (isOnline) {
          const { error } = await client
            .from('favoritos')
            .delete()
            .match({ unidad_id, usuario_id: resolvedUserId });

          if (error) throw new InternalServerErrorException(error.message);
          return { ok: true };
        }
      } catch (err: unknown) {
        if (err instanceof InternalServerErrorException) throw err;
        if (isReleaseRuntime()) throw unavailable();
      }
    }

    if (isReleaseRuntime()) throw unavailable();

    return resilientStore.removeFavorito(resolvedUserId, unidad_id);
  }
}
