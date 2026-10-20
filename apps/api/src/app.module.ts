import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { UnidadesModule } from './unidades/unidades.module.js';
import { CupoModule } from './cupo/cupo.module.js';
import { MarketplaceModule } from './marketplace/marketplace.module.js';
import { FavoritosModule } from './favoritos/favoritos.module.js';
import { ReportesModule } from './reportes/reportes.module.js';
import { GruposModule } from './grupos/grupos.module.js';
import { InquilinosModule } from './inquilinos/inquilinos.module.js';
import { AlquileresModule } from './alquileres/alquileres.module.js';
import { DelegadosModule } from './delegados/delegados.module.js';
import { TraduccionService } from './common/services/traduccion/traduccion.service.js';
import { PagosModule } from './pagos/pagos.module.js';
import { MetricasModule } from './metricas/metricas.module.js';
import { AfipModule } from './afip/afip.module.js';
import { AuthorizationModule } from './authorization/authorization.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    SupabaseModule,
    UnidadesModule,
    CupoModule,
    MarketplaceModule,
    FavoritosModule,
    ReportesModule,
    GruposModule,
    InquilinosModule,
    AlquileresModule,
    DelegadosModule,
    PagosModule,
    MetricasModule,
    AfipModule,
    AuthorizationModule,
  ],
  controllers: [AppController],
  providers: [AppService, TraduccionService],
})
export class AppModule {}
