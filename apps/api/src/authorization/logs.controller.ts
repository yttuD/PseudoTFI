import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from './authorization.service.js';
import { ActionLogService } from './action-log.service.js';

@Controller('logs')
@UseGuards(SupabaseAuthGuard)
export class LogsController {
  constructor(
    private readonly actionLogService: ActionLogService,
    private readonly authzService: AuthorizationService,
  ) {}

  @Get()
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
}
