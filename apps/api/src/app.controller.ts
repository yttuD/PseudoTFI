import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { SupabaseService } from './supabase/supabase.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok' };
  }

  @Get('health/ready')
  async readiness() {
    if (!await this.supabaseService.isOnline()) {
      throw new ServiceUnavailableException('Dependency unavailable');
    }
    try {
      const { error } = await this.supabaseService.getClient()
        .from('ciudades').select('id').limit(1);
      if (error) throw error;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Dependency unavailable');
    }
  }

}
