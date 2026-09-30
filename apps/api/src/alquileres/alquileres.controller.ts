import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AlquileresService } from './alquileres.service.js';
import { CreateAlquilerDto } from './dto/create-alquiler.dto.js';
import { UpdateAlquilerDto } from './dto/update-alquiler.dto.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ActionLogService } from '../authorization/action-log.service.js';

@UseGuards(SupabaseAuthGuard)
@Controller('alquileres')
export class AlquileresController {
  constructor(
    private readonly alquileresService: AlquileresService,
    private readonly authzService: AuthorizationService,
    private readonly actionLogService: ActionLogService,
  ) {}

  @Post()
  async create(
    @Body() createAlquilerDto: CreateAlquilerDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManageUnit = await this.authzService.canManageUnidad(
      req.user,
      createAlquilerDto.unidad_id,
    );
    if (!canManageUnit) {
      throw new ForbiddenException(
        'Permiso insuficiente: No tienes permisos de gestión sobre la Unidad especificada',
      );
    }
    const token = this.extractToken(req);
    return this.alquileresService.create(createAlquilerDto, token, req.user.workspace_id);
  }

  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const token = this.extractToken(req);
    const l = limit ? parseInt(limit, 10) : 10;
    const o = offset ? parseInt(offset, 10) : 0;
    const result = await this.alquileresService.findAll(token, l, o);

    if (req.user.rol === 'delegado') {
      const scoped = [];
      for (const alq of result.data) {
        if (await this.authzService.canReadUnidad(req.user, alq.unidad_id)) {
          scoped.push(alq);
        }
      }
      return {
        data: scoped,
        total: scoped.length,
        limit: l,
        offset: o,
      };
    }

    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const canRead = await this.authzService.canReadAlquiler(req.user, id);
    if (!canRead) {
      throw new NotFoundException('Alquiler no encontrado');
    }
    const token = this.extractToken(req);
    return this.alquileresService.findOne(id, token);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAlquilerDto: UpdateAlquilerDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManage = await this.authzService.canManageAlquiler(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Alquiler no encontrado o sin permisos de gestión');
    }
    if (updateAlquilerDto.unidad_id) {
      const canManageTargetUnit = await this.authzService.canManageUnidad(
        req.user,
        updateAlquilerDto.unidad_id,
      );
      if (!canManageTargetUnit) {
        throw new ForbiddenException(
          'Permiso insuficiente: No tienes permiso de gestión sobre la nueva Unidad',
        );
      }
    }
    const token = this.extractToken(req);
    return this.alquileresService.update(id, updateAlquilerDto, token);
  }

  @Delete('dev/limpiar')
  limpiarDev(@Request() req: AuthenticatedRequest) {
    this.authzService.assertOwnerOnly(req.user);
    return { ok: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const canManage = await this.authzService.canManageAlquiler(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Alquiler no encontrado o sin permisos de gestión');
    }
    const token = this.extractToken(req);
    return this.alquileresService.remove(id, token);
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
