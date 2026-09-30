import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DelegadosService } from './delegados.service.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ActionLogService } from '../authorization/action-log.service.js';
import { CreateInvitacionDto } from './dto/create-invitacion.dto.js';
import { ConfigureDelegacionDto } from './dto/configure-delegacion.dto.js';

@Controller('delegados')
@UseGuards(SupabaseAuthGuard)
export class DelegadosController {
  constructor(
    private readonly delegadosService: DelegadosService,
    private readonly authzService: AuthorizationService,
    private readonly actionLogService: ActionLogService,
  ) {}

  @Get('contexto')
  async getAccessContext(@Request() req: AuthenticatedRequest) {
    return this.authzService.resolveAccessContext(req.user);
  }

  @Get('logs')
  async getLogs(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.authzService.assertOwnerOnly(req.user);
    return this.actionLogService.getLogs(
      req.user.id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  private extractUser(req: AuthenticatedRequest): AuthenticatedUser {
    const token =
      req.user?.token ||
      (req as any).token ||
      (req.headers?.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : undefined);
    return {
      ...req.user,
      token,
    };
  }

  @Get()
  async listDelegados(@Request() req: AuthenticatedRequest) {
    return this.delegadosService.listDelegados(this.extractUser(req));
  }

  @Post('invitaciones')
  @HttpCode(HttpStatus.CREATED)
  async createInvitation(
    @Body() dto: CreateInvitacionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.delegadosService.createInvitation(this.extractUser(req), dto.email);
  }

  // Alias for backward compatibility
  @Post('invitar')
  @HttpCode(HttpStatus.CREATED)
  async invitar(
    @Body() dto: CreateInvitacionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.delegadosService.createInvitation(this.extractUser(req), dto.email);
  }

  @Get('invitaciones/recibidas')
  async listReceivedInvitations(@Request() req: AuthenticatedRequest) {
    return this.delegadosService.listReceivedInvitations(this.extractUser(req));
  }

  @Post('invitaciones/:invitationId/aceptar')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Param('invitationId') invitationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.delegadosService.acceptInvitation(invitationId, this.extractUser(req));
  }

  @Post('invitaciones/:invitationId/rechazar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejectInvitation(
    @Param('invitationId') invitationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.delegadosService.rejectInvitation(invitationId, this.extractUser(req));
  }

  @Delete('invitaciones/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvitation(
    @Param('invitationId') invitationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.delegadosService.cancelInvitation(invitationId, this.extractUser(req));
  }

  @Put(':delegationId/configuracion')
  @HttpCode(HttpStatus.OK)
  async configureDelegado(
    @Param('delegationId') delegationId: string,
    @Body() dto: ConfigureDelegacionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.delegadosService.configureDelegado(delegationId, this.extractUser(req), dto);
  }

  @Delete(':delegationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeDelegado(
    @Param('delegationId') delegationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.delegadosService.revokeDelegado(delegationId, this.extractUser(req));
  }
}
