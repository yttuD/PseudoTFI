import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('SUPABASE_JWT_SECRET'),
      }),
    }),
  ],
  providers: [SupabaseAuthGuard],
  exports: [SupabaseAuthGuard, JwtModule],
})
export class AuthModule {}
