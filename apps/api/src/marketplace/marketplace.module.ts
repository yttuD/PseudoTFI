import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller.js';
import { MarketplaceService } from './marketplace.service.js';
import { SupabaseModule } from '../supabase/supabase.module.js';

@Module({
  imports: [SupabaseModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
