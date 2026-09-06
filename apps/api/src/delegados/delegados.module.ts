import { Module } from '@nestjs/common';
import { DelegadosService } from './delegados.service.js';
import { DelegadosController } from './delegados.controller.js';

@Module({
  providers: [DelegadosService],
  controllers: [DelegadosController],
})
export class DelegadosModule {}
