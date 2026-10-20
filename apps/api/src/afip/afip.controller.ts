import { Body, Controller, Get, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { type Response } from 'express';
import { AfipService } from './afip.service.js';
import { EmitirComprobanteDto } from './dto/emitir-comprobante.dto.js';
import { SaveAfipConfigDto } from './dto/save-afip-config.dto.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from '../authorization/authorization.service.js';

@Controller('afip')
@UseGuards(SupabaseAuthGuard)
export class AfipController {
  constructor(
    private readonly afipService: AfipService,
    private readonly authzService: AuthorizationService,
  ) {}

  @Get('config')
  async getConfig(@Req() req: AuthenticatedRequest) {
    this.authzService.assertOwnerOnly(req.user);
    const token = this.extractToken(req);
    return this.afipService.getConfig(token, req.user.id);
  }

  @Post('config')
  async saveConfig(@Body() dto: SaveAfipConfigDto, @Req() req: AuthenticatedRequest) {
    this.authzService.assertOwnerOnly(req.user);
    const token = this.extractToken(req);
    return this.afipService.saveConfig(dto, token, req.user.id);
  }

  @Put('config')
  async updateConfig(@Body() dto: SaveAfipConfigDto, @Req() req: AuthenticatedRequest) {
    this.authzService.assertOwnerOnly(req.user);
    const token = this.extractToken(req);
    return this.afipService.saveConfig(dto, token, req.user.id);
  }

  @Post('comprobantes')
  async emitirComprobante(@Body() dto: EmitirComprobanteDto, @Req() req: AuthenticatedRequest) {
    this.authzService.assertOwnerOnly(req.user);
    const token = this.extractToken(req);
    return this.afipService.emitirComprobante(dto, token, req.user.id);
  }

  @Get('comprobantes')
  async findAll(@Req() req: AuthenticatedRequest) {
    this.authzService.assertOwnerOnly(req.user);
    const token = this.extractToken(req);
    return this.afipService.findAll(token, req.user.id);
  }

  @Get('comprobantes/:id/pdf')
  async downloadPdf(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Res() res: Response) {
    this.authzService.assertOwnerOnly(req.user);
    const token = this.extractToken(req);

    const { buffer, filename } = await this.afipService.getPdfBuffer(id, token, req.user.id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token || '';
  }
}
