import { Module, Global } from '@nestjs/common';
import { AuthorizationService } from './authorization.service.js';
import { ActionLogService } from './action-log.service.js';
import { LogsController } from './logs.controller.js';
import { SupabaseModule } from '../supabase/supabase.module.js';

@Global()
@Module({
  imports: [SupabaseModule],
  controllers: [LogsController],
  providers: [AuthorizationService, ActionLogService],
  exports: [AuthorizationService, ActionLogService],
})
export class AuthorizationModule {}
