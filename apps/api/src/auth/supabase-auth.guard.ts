import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: any; // Using any for payload for now, or could define JwtPayload
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }
    
    try {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL')!;
      const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY')!;
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });
      
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        throw new Error(error?.message || 'User not found');
      }

      // Fetch user role and workspace_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('rol, workspace_id')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.warn('Could not fetch user metadata from users table:', userError.message);
      }

      request.user = {
        ...data.user,
        rol: userData?.rol || 'gestor',
        workspace_id: userData?.workspace_id || data.user.id,
      };
    } catch (e: any) {
      console.error('JWT Verification Error:', e.message);
      throw new UnauthorizedException('Token inválido');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
