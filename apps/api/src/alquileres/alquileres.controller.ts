import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { AlquileresService } from './alquileres.service.js';
import { CreateAlquilerDto } from './dto/create-alquiler.dto.js';
import { UpdateAlquilerDto } from './dto/update-alquiler.dto.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';

@UseGuards(SupabaseAuthGuard)
@Controller('alquileres')
export class AlquileresController {
  constructor(private readonly alquileresService: AlquileresService) {}

  @Post()
  create(
    @Body() createAlquilerDto: CreateAlquilerDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const token = this.extractToken(req);
    return this.alquileresService.create(createAlquilerDto, token, req.user.workspace_id);
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const token = this.extractToken(req);
    const l = limit ? parseInt(limit, 10) : 10;
    const o = offset ? parseInt(offset, 10) : 0;
    return this.alquileresService.findAll(token, l, o);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAlquilerDto: UpdateAlquilerDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const token = this.extractToken(req);
    return this.alquileresService.update(id, updateAlquilerDto, token);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.alquileresService.remove(id, token);
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
