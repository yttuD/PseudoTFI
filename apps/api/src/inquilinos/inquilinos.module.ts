import { Module } from '@nestjs/common';
import { InquilinosService } from './inquilinos.service.js';
import { InquilinosController } from './inquilinos.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [InquilinosController],
  providers: [InquilinosService],
})
export class InquilinosModule {}
