import { Controller, Get, Post, Param, Query, Request } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service.js';
import { BuscarUnidadesDto } from './dto/buscar-unidades.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { Request as ExpressRequest } from 'express';
import { isReleaseRuntime } from '../config/release-readiness.js';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('unidades')
  findAll(@Query() query: BuscarUnidadesDto) {
    return this.marketplaceService.findAll(query);
  }

  @Get('unidades/:id')
  async findOne(@Param('id') id: string, @Query('locale') locale: string, @Request() req: ExpressRequest) {
    const token = this.extractTokenFromHeader(req);
    let isAuthenticated = false;

    if (token) {
      if (token.startsWith('dev-') || token.startsWith('mock-')) {
        isAuthenticated = !isReleaseRuntime();
      } else {
        try {
          const supabase = this.supabaseService.getClient(token);
          const { data, error } = await supabase.auth.getUser(token);
          isAuthenticated = !error && !!data?.user;
        } catch {
          isAuthenticated = false;
        }
      }
    }

    const safeLocale = ['es', 'pt', 'en'].includes(locale) ? locale : 'es';
    return this.marketplaceService.findOne(id, isAuthenticated, safeLocale);
  }

  @Post('unidades/:id/vista')
  registrarVista(@Param('id') id: string, @Request() req: ExpressRequest) {
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || req.socket.remoteAddress || '127.0.0.1';
    return this.marketplaceService.registrarVista(id, rawIp);
  }

  @Post('unidades/:id/contacto')
  registrarContacto(@Param('id') id: string, @Request() req: ExpressRequest) {
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || req.socket.remoteAddress || '127.0.0.1';
    return this.marketplaceService.registrarContacto(id, rawIp);
  }

  @Get('zonas')
  getZonas() {
    return this.marketplaceService.getZonas();
  }

  private extractTokenFromHeader(request: ExpressRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
