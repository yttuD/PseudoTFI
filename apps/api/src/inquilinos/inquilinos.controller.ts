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
import { InquilinosService } from './inquilinos.service.js';
import { CreateInquilinoDto } from './dto/create-inquilino.dto.js';
import { UpdateInquilinoDto } from './dto/update-inquilino.dto.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';

@UseGuards(SupabaseAuthGuard)
@Controller('inquilinos')
export class InquilinosController {
  constructor(private readonly inquilinosService: InquilinosService) {}

  @Post()
  create(
    @Body() createInquilinoDto: CreateInquilinoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const token = this.extractToken(req);
    return this.inquilinosService.create(createInquilinoDto, token, req.user.workspace_id);
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
    return this.inquilinosService.findAll(token, l, o);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInquilinoDto: UpdateInquilinoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const token = this.extractToken(req);
    return this.inquilinosService.update(id, updateInquilinoDto, token);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.inquilinosService.remove(id, token);
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
