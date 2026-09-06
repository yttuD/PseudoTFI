import { Module } from '@nestjs/common';
import { UnidadesService } from './unidades.service.js';
import { UnidadesController } from './unidades.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { CupoModule } from '../cupo/cupo.module.js';

import { TraduccionService } from '../common/services/traduccion/traduccion.service.js';

@Module({
  imports: [AuthModule, CupoModule],
  controllers: [UnidadesController],
  providers: [UnidadesService, TraduccionService],
})
export class UnidadesModule {}
