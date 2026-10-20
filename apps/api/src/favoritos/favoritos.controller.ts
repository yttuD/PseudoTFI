import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, HttpCode } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { FavoritosService } from './favoritos.service.js';
import { CreateFavoritoDto } from './dto/create-favorito.dto.js';
import { SupabasePublicAuthGuard } from '../auth/supabase-public-auth.guard.js';

@Controller('favoritos')
@UseGuards(SupabasePublicAuthGuard)
export class FavoritosController {
  constructor(private readonly favoritosService: FavoritosService) {}

  @Post()
  create(@Body() createFavoritoDto: CreateFavoritoDto, @Request() req: ExpressRequest & { user?: { id: string } }) {
    return this.favoritosService.create(createFavoritoDto, req.headers?.authorization as string, req.user?.id);
  }

  @Get()
  findAll(@Request() req: ExpressRequest & { user?: { id: string } }) {
    return this.favoritosService.findAll(req.headers?.authorization as string, req.user?.id);
  }

  @Delete(':unidad_id')
  @HttpCode(200)
  remove(@Param('unidad_id') unidad_id: string, @Request() req: ExpressRequest & { user?: { id: string } }) {
    return this.favoritosService.remove(unidad_id, req.headers?.authorization as string, req.user?.id);
  }
}
