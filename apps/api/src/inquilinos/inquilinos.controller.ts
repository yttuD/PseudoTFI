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
import { InquilinosService } from './inquilinos.service.js';
import { CreateInquilinoDto } from './dto/create-inquilino.dto.js';
import { UpdateInquilinoDto } from './dto/update-inquilino.dto.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ActionLogService } from '../authorization/action-log.service.js';

@UseGuards(SupabaseAuthGuard)
@Controller('inquilinos')
export class InquilinosController {
  constructor(
    private readonly inquilinosService: InquilinosService,
    private readonly authzService: AuthorizationService,
    private readonly actionLogService: ActionLogService,
  ) {}

  @Post()
  async create(
    @Body() createInquilinoDto: CreateInquilinoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.rol === 'delegado') {
      const ctx = await this.authzService.resolveAccessContext(req.user);
      if (ctx.actor !== 'delegado' || ctx.state !== 'activo' || ctx.permiso !== 'gestionar') {
        throw new ForbiddenException(
          'Permiso insuficiente: Solo Delegados con permiso Gestionar pueden crear inquilinos',
        );
      }
    }
    const token = this.extractToken(req);
    return this.inquilinosService.create(createInquilinoDto, token, req.user.workspace_id);
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
    const result = await this.inquilinosService.findAll(token, l, o);

    if (req.user.rol === 'delegado') {
      const scoped: any[] = [];
      for (const inq of result.data) {
        if (await this.authzService.canReadInquilino(req.user, inq.id)) {
          scoped.push(inq);
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
    const canRead = await this.authzService.canReadInquilino(req.user, id);
    if (!canRead) {
      throw new NotFoundException('Inquilino no encontrado');
    }
    const token = this.extractToken(req);
    return this.inquilinosService.findOne(id, token);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateInquilinoDto: UpdateInquilinoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canManage = await this.authzService.canManageInquilino(req.user, id);
    if (!canManage) {
      throw new NotFoundException('Inquilino no encontrado o sin permisos de gestión');
    }
    const token = this.extractToken(req);
    return this.inquilinosService.update(id, updateInquilinoDto, token);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (req.user.rol !== 'gestor') {
      throw new ForbiddenException(
        'Acción restringida: La eliminación de inquilinos está reservada al Gestor dueño',
      );
    }
    const token = this.extractToken(req);
    return this.inquilinosService.remove(id, token);
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
