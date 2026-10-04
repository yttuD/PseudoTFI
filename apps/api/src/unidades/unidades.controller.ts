import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UnidadesService } from './unidades.service.js';
import { CreateUnidadDto } from './dto/create-unidad.dto.js';
import { UpdateUnidadDto } from './dto/update-unidad.dto.js';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto.js';
import { GetUnidadesDto } from './dto/get-unidades.dto.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { CreateModalidadPrecioDto } from './dto/create-modalidad-precio.dto.js';
import { UpdateModalidadPrecioDto } from './dto/update-modalidad-precio.dto.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ActionLogService } from '../authorization/action-log.service.js';

@UseGuards(SupabaseAuthGuard)
@Controller('unidades')
export class UnidadesController {
  constructor(
    private readonly unidadesService: UnidadesService,
    private readonly authzService: AuthorizationService,
    private readonly actionLogService: ActionLogService,
  ) {}

  @Post()
  async create(
    @Body() createUnidadDto: CreateUnidadDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canCreate = await this.authzService.canCreateUnidad(
      req.user,
      req.user.workspace_id,
      createUnidadDto.grupo_id,
    );
    if (!canCreate) {
      throw new ForbiddenException(
        'Permiso insuficiente: No tienes permiso para crear una Unidad con el alcance actual',
      );
    }

    const token = this.extractToken(req);
    return this.unidadesService.create(createUnidadDto, token, req.user.workspace_id);
  }

  @Get()
  async findAll(
    @Query() query: GetUnidadesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    if (req.user.rol === 'delegado') {
      const accessContext = await this.authzService.resolveAccessContext(req.user);
      if (
        accessContext.actor !== 'delegado' ||
        accessContext.state !== 'activo' ||
        !accessContext.scope
      ) {
        return {
          data: [],
          count: 0,
          page,
          limit,
        };
      }

      const token = this.extractToken(req);
      return this.unidadesService.findAll(
        query,
        token,
        req.user.workspace_id,
        accessContext.scope,
      );
    }

    const token = this.extractToken(req);
    return this.unidadesService.findAll(query, token, req.user.workspace_id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const canRead = await this.authzService.canReadUnidad(req.user, id);
    if (!canRead) {
      throw new NotFoundException('Unidad no encontrada');
    }

    const token = this.extractToken(req);
    return this.unidadesService.findOne(id, token);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUnidadDto: UpdateUnidadDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManage = await this.authzService.canManageUnidad(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Unidad no encontrada o sin permisos de gestión');
    }

    const token = this.extractToken(req);
    return this.unidadesService.update(id, updateUnidadDto, token, req.user.workspace_id);
  }

  @Patch(':id/estado')
  async cambiarEstado(
    @Param('id') id: string,
    @Body() cambiarEstadoDto: CambiarEstadoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManage = await this.authzService.canManageUnidad(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Unidad no encontrada o sin permisos de gestión');
    }

    const token = this.extractToken(req);
    return this.unidadesService.cambiarEstado(id, cambiarEstadoDto, token);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const canManage = await this.authzService.canManageUnidad(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Unidad no encontrada o sin permisos de gestión');
    }

    const token = this.extractToken(req);
    return this.unidadesService.remove(id, token);
  }

  @Post(':id/modalidades')
  async createModalidad(
    @Param('id') id: string,
    @Body() createModalidadDto: CreateModalidadPrecioDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManage = await this.authzService.canManageUnidad(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Unidad no encontrada o sin permisos de gestión');
    }

    const token = this.extractToken(req);
    return this.unidadesService.createModalidad(id, createModalidadDto, token);
  }

  @Patch(':id/modalidades/:modId')
  async updateModalidad(
    @Param('id') id: string,
    @Param('modId') modId: string,
    @Body() updateModalidadDto: UpdateModalidadPrecioDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManage = await this.authzService.canManageUnidad(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Unidad no encontrada o sin permisos de gestión');
    }

    const token = this.extractToken(req);
    return this.unidadesService.updateModalidad(id, modId, updateModalidadDto, token);
  }

  @Delete(':id/modalidades/:modId')
  async removeModalidad(
    @Param('id') id: string,
    @Param('modId') modId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManage = await this.authzService.canManageUnidad(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Unidad no encontrada o sin permisos de gestión');
    }

    const token = this.extractToken(req);
    return this.unidadesService.removeModalidad(id, modId, token);
  }

  @Get(':id/alquileres')
  async getAlquileres(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const canRead = await this.authzService.canReadUnidad(req.user, id);
    if (!canRead) {
      throw new NotFoundException('Unidad no encontrada');
    }

    const token = this.extractToken(req);
    return this.unidadesService.getAlquileres(id, token);
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
