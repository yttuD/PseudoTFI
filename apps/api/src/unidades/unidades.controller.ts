import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { UnidadesService } from './unidades.service.js';
import { CreateUnidadDto } from './dto/create-unidad.dto.js';
import { UpdateUnidadDto } from './dto/update-unidad.dto.js';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto.js';
import { GetUnidadesDto } from './dto/get-unidades.dto.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { CreateModalidadPrecioDto } from './dto/create-modalidad-precio.dto.js';
import { UpdateModalidadPrecioDto } from './dto/update-modalidad-precio.dto.js';

@UseGuards(SupabaseAuthGuard)
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @Post()
  create(@Body() createUnidadDto: CreateUnidadDto, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.create(createUnidadDto, token, req.user.workspace_id);
  }

  @Get()
  findAll(@Query() query: GetUnidadesDto, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.findAll(query, token);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.findOne(id, token);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUnidadDto: UpdateUnidadDto, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.update(id, updateUnidadDto, token);
  }

  @Patch(':id/estado')
  cambiarEstado(@Param('id') id: string, @Body() cambiarEstadoDto: CambiarEstadoDto, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.cambiarEstado(id, cambiarEstadoDto, token);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.remove(id, token);
  }

  @Post(':id/modalidades')
  createModalidad(@Param('id') id: string, @Body() createModalidadDto: CreateModalidadPrecioDto, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.createModalidad(id, createModalidadDto, token);
  }

  @Patch(':id/modalidades/:modId')
  updateModalidad(@Param('id') id: string, @Param('modId') modId: string, @Body() updateModalidadDto: UpdateModalidadPrecioDto, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.updateModalidad(id, modId, updateModalidadDto, token);
  }

  @Delete(':id/modalidades/:modId')
  removeModalidad(@Param('id') id: string, @Param('modId') modId: string, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.removeModalidad(id, modId, token);
  }

  @Get(':id/alquileres')
  getAlquileres(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.unidadesService.getAlquileres(id, token);
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
