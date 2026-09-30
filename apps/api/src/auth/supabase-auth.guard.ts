import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service.js';

export const AUTH_UNAUTHORIZED_MESSAGE = 'Token inválido o no autorizado';

export type OperationalRole = 'gestor' | 'delegado';
export type DemoRole = OperationalRole | 'buscador';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  rol: DemoRole;
  workspace_id: string;
  token?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const GENERATED_DEV_TOKEN_REGEX =
  /^dev-token-(gestor|delegado|buscador)-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

const FIXED_GESTOR_ID = '11111111-1111-1111-1111-111111111111';
const FIXED_DELEGADO_ID = '33333333-3333-3333-3333-333333333333';
const FIXED_BUSCADOR_ID = '22222222-2222-2222-2222-222222222222';

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    // Check if credential belongs to local demo space
    if (this.isLocalDemoCredential(token)) {
      if (!this.isDemoAuthAllowed()) {
        throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
      }

      const demoIdentity = this.parseLocalDemoToken(token);
      if (!demoIdentity) {
        throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
      }

      request.user = {
        id: demoIdentity.id,
        rol: demoIdentity.rol,
        workspace_id: demoIdentity.workspace_id,
      };
      (request as any).token = token;

      return true;
    }

    // Deployed credential path
    try {
      const supabase = this.supabaseService.getClient(token);
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data?.user || !isValidUuid(data.user.id)) {
        throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
      }

      const user = data.user;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, rol, workspace_id, deleted_at')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
      }

      if (profile.deleted_at !== null) {
        throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
      }

      let resolvedWorkspaceId: string;
      const rol = profile.rol;

      if (rol === 'gestor') {
        if (profile.workspace_id && profile.workspace_id !== user.id) {
          throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
        }
        resolvedWorkspaceId = user.id;
      } else if (rol === 'delegado') {
        if (
          !profile.workspace_id ||
          profile.workspace_id === user.id ||
          !isValidUuid(profile.workspace_id)
        ) {
          throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
        }
        resolvedWorkspaceId = profile.workspace_id;
      } else {
        throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
      }

      request.user = {
        id: user.id,
        email: user.email ? String(user.email) : undefined,
        rol,
        workspace_id: resolvedWorkspaceId,
      };
      (request as any).token = token;

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }
  }

  private extractTokenFromHeader(request: Request): string {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
    }

    return parts[1];
  }

  private isLocalDemoCredential(token: string): boolean {
    return token.startsWith('dev-token-') || token.startsWith('dev-access-token');
  }

  private isDemoAuthAllowed(): boolean {
    const allowDevTokens = this.configService.get<string>('AUTH_ALLOW_DEV_TOKENS');
    if (allowDevTokens !== 'true') {
      return false;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV');
    return nodeEnv === 'development' || nodeEnv === 'test';
  }

  private parseLocalDemoToken(
    token: string,
  ): { id: string; rol: DemoRole; workspace_id: string } | null {
    if (token === 'dev-access-token' || token === 'dev-access-token-gestor') {
      return {
        id: FIXED_GESTOR_ID,
        rol: 'gestor',
        workspace_id: FIXED_GESTOR_ID,
      };
    }

    if (token === 'dev-access-token-delegado') {
      return {
        id: FIXED_DELEGADO_ID,
        rol: 'delegado',
        workspace_id: FIXED_GESTOR_ID,
      };
    }

    if (token === 'dev-access-token-buscador') {
      return {
        id: FIXED_BUSCADOR_ID,
        rol: 'buscador',
        workspace_id: FIXED_BUSCADOR_ID,
      };
    }

    const match = token.match(GENERATED_DEV_TOKEN_REGEX);
    if (!match) {
      return null;
    }

    const role = match[1] as DemoRole;
    const uuid = match[2].toLowerCase();

    if (role === 'gestor') {
      return {
        id: uuid,
        rol: 'gestor',
        workspace_id: uuid,
      };
    }

    if (role === 'buscador') {
      return {
        id: uuid,
        rol: 'buscador',
        workspace_id: uuid,
      };
    }

    if (role === 'delegado') {
      return {
        id: uuid,
        rol: 'delegado',
        workspace_id: FIXED_GESTOR_ID,
      };
    }

    return null;
  }
}
