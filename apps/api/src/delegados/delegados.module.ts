import { Module } from '@nestjs/common';
import { DelegadosService } from './delegados.service.js';
import { DelegadosController } from './delegados.controller.js';
import { DelegationNotificationService } from './delegation-notification.service.js';

@Module({
  providers: [DelegadosService, DelegationNotificationService],
  controllers: [DelegadosController],
  exports: [DelegadosService],
})
export class DelegadosModule {}
