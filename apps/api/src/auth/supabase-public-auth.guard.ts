import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { SupabaseAuthGuard, AUTH_UNAUTHORIZED_MESSAGE } from './supabase-auth.guard.js';
import { isReleaseRuntime } from '../config/release-readiness.js';

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Injectable()
export class SupabasePublicAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly operationalGuard: SupabaseAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isReleaseRuntime()) return this.operationalGuard.canActivate(context) as Promise<boolean>;

    const request = context.switchToHttp().getRequest();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    try {
      const client = this.supabaseService.getClient(token);
      const { data: auth, error: authError } = await client.auth.getUser(token);
      const userId = auth?.user?.id;
      if (authError || !userId || !UUID.test(userId)) throw new Error('Invalid identity');
      const { data: profile, error: profileError } = await client.from('users')
        .select('id,rol,deleted_at').eq('id', userId).single();
      if (profileError || !profile || profile.deleted_at !== null ||
          !['buscador', 'gestor', 'delegado'].includes(profile.rol)) {
        throw new Error('Inactive profile');
      }
      request.user = {
        id: userId,
        email: auth.user.email,
        rol: profile.rol,
        workspace_id: userId,
      };
      return true;
    } catch {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }
  }
}
