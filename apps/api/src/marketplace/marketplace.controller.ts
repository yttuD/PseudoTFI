import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service.js';
import { BuscarUnidadesDto } from './dto/buscar-unidades.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { Request as ExpressRequest } from 'express';

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
      const supabase = this.supabaseService.getClient();
      const { data } = await supabase.auth.getUser(token);
      if (data && data.user) {
        isAuthenticated = true;
      }
    }

    return this.marketplaceService.findOne(id, isAuthenticated, locale || 'es');
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
