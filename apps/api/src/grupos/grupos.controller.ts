import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GruposService } from './grupos.service.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ActionLogService } from '../authorization/action-log.service.js';
import { CreateGrupoDto } from './dto/create-grupo.dto.js';
import { UpdateGrupoDto } from './dto/update-grupo.dto.js';

@UseGuards(SupabaseAuthGuard)
@Controller('grupos')
export class GruposController {
  constructor(
    private readonly gruposService: GruposService,
    private readonly authzService: AuthorizationService,
    private readonly actionLogService: ActionLogService,
  ) {}

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    const grupos = await this.gruposService.findAll(req.user.workspace_id, token);
    
    // Scoped filtering for Delegados
    if (req.user.rol === 'delegado') {
      const allowed = [];
      for (const g of grupos) {
        if (await this.authzService.canReadGrupo(req.user, g.id)) {
          allowed.push(g);
        }
      }
      return allowed;
    }
    return grupos;
  }

  @Post()
  async create(
    @Body() createGrupoDto: CreateGrupoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.rol === 'delegado') {
      const ctx = await this.authzService.resolveAccessContext(req.user);
      if (
        ctx.actor !== 'delegado' ||
        ctx.state !== 'activo' ||
        ctx.permiso !== 'gestionar' ||
        ctx.scope.alcanceTipo !== 'cuenta'
      ) {
        throw new ForbiddenException(
          'Permiso insuficiente: Solo el Gestor o Delegado con alcance Cuenta puede crear grupos',
        );
      }
    }
    const token = this.extractToken(req);
    return this.gruposService.create(createGrupoDto, req.user.workspace_id, token);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGrupoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManage = await this.authzService.canManageGrupo(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Grupo no encontrado o sin permisos');
    }
    const token = this.extractToken(req);
    return this.gruposService.update(id, updateDto, token);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManageMembership = await this.authzService.canManageGrupoMembership(req.user, id);
    if (!canManageMembership) {
      throw new ForbiddenException('Solo el Gestor o Delegado con alcance Cuenta puede eliminar un grupo');
    }
    const token = this.extractToken(req);
    return this.gruposService.remove(id, token);
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
