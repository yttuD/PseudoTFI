import { Module } from '@nestjs/common';
import { AlquileresService } from './alquileres.service.js';
import { AlquileresController } from './alquileres.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [AlquileresController],
  providers: [AlquileresService],
})
export class AlquileresModule {}
