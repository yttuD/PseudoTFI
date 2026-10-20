import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EmitirComprobanteDto } from './dto/emitir-comprobante.dto.js';
import { SaveAfipConfigDto } from './dto/save-afip-config.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { resilientStore, ResilientAfipComprobante, ResilientGestorAfipConfig } from '../common/resilient-store.js';
import { generateAfipPdfBuffer, AfipComprobanteData } from './afip-pdf.generator.js';
import { isReleaseRuntime } from '../config/release-readiness.js';

export interface AfipConfigResponse extends Partial<ResilientGestorAfipConfig> {
  configurado: boolean;
}

@Injectable()
export class AfipService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private assertSandboxOnly(): void {
    if (isReleaseRuntime()) {
      throw new ServiceUnavailableException('La emisión fiscal no está disponible en esta versión de prueba');
    }
  }

  private resolverTipoComprobante(codigo: number): string {
    switch (codigo) {
      case 15:
        return 'Recibo de Alquiler C';
      case 6:
        return 'Factura B';
      case 11:
      default:
        return 'Factura C';
    }
  }

  private generarCae(): string {
    // Generar 14 dígitos numéricos para el CAE reglamentario
    let res = '7';
    for (let i = 0; i < 13; i++) {
      res += Math.floor(Math.random() * 10).toString();
    }
    return res;
  }

  async getConfig(token: string, workspaceId: string): Promise<AfipConfigResponse> {
    this.assertSandboxOnly();
    try {
      const client = this.supabaseService.getClient(token);
      const { data, error } = await client
        .from('gestor_afip_config')
        .select('*')
        .eq('gestor_id', workspaceId)
        .maybeSingle();

      if (!error && data) {
        return { configurado: true, ...data };
      }
    } catch {
      // Fallback
    }

    const mem = resilientStore.getAfipConfig(workspaceId);
    if (mem) {
      return { configurado: true, ...mem };
    }

    return { configurado: false };
  }

  async saveConfig(dto: SaveAfipConfigDto, token: string, workspaceId: string): Promise<AfipConfigResponse> {
    this.assertSandboxOnly();
    const mem = resilientStore.saveAfipConfig(workspaceId, {
      cuit: dto.cuit,
      razon_social: dto.razon_social,
      condicion_iva: dto.condicion_iva,
      punto_venta: dto.punto_venta,
      iibb: dto.iibb,
      inicio_actividades: dto.inicio_actividades,
      domicilio_fiscal: dto.domicilio_fiscal,
      entorno: dto.entorno || 'homologacion',
    });

    try {
      const client = this.supabaseService.getClient(token);
      const record = {
        gestor_id: workspaceId,
        cuit: dto.cuit,
        razon_social: dto.razon_social,
        condicion_iva: dto.condicion_iva,
        punto_venta: dto.punto_venta,
        iibb: dto.iibb || null,
        inicio_actividades: dto.inicio_actividades || null,
        domicilio_fiscal: dto.domicilio_fiscal,
        entorno: dto.entorno || 'homologacion',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await client
        .from('gestor_afip_config')
        .upsert(record, { onConflict: 'gestor_id' })
        .select()
        .single();

      if (!error && data) {
        return { configurado: true, ...data };
      }
    } catch {
      // Fallback a memoria
    }

    return { configurado: true, ...mem };
  }

  async emitirComprobante(dto: EmitirComprobanteDto, token: string, workspaceId: string): Promise<ResilientAfipComprobante> {
    this.assertSandboxOnly();
    // 1. Validar si el gestor configuró sus datos fiscales
    const config = await this.getConfig(token, workspaceId);
    if (!config || !config.configurado) {
      throw new BadRequestException('Debe configurar sus datos fiscales de emisor antes de generar comprobantes.');
    }

    // 2. Tomar automáticamente punto_venta, cuit_emisor y datos oficiales
    const puntoVenta = config.punto_venta || dto.punto_venta || 1;
    const cuitEmisor = config.cuit || dto.cuit_emisor || '20334455667';
    const tipoStr = this.resolverTipoComprobante(dto.tipo_comprobante_codigo);
    const cae = this.generarCae();
    const caeDueDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
    const emisionDate = new Date().toISOString().split('T')[0];

    // Intentar persistir en Supabase
    try {
      const client = this.supabaseService.getClient(token);

      // Obtener el último número de comprobante para este punto de venta y tipo
      const { data: lastCmp } = await client
        .from('afip_comprobantes')
        .select('numero_comprobante')
        .eq('gestor_id', workspaceId)
        .eq('punto_venta', puntoVenta)
        .eq('tipo_comprobante_codigo', dto.tipo_comprobante_codigo)
        .order('numero_comprobante', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNro = (lastCmp?.numero_comprobante || 100) + 1;

      const record = {
        gestor_id: workspaceId,
        alquiler_id: dto.alquiler_id || null,
        tipo_comprobante: tipoStr,
        tipo_comprobante_codigo: dto.tipo_comprobante_codigo,
        punto_venta: puntoVenta,
        numero_comprobante: nextNro,
        concepto: dto.concepto || 2,
        cuit_emisor: cuitEmisor,
        receptor_nombre: dto.receptor_nombre,
        receptor_doc_tipo: dto.receptor_doc_tipo,
        receptor_doc_nro: dto.receptor_doc_nro,
        fecha_emision: emisionDate,
        periodo_desde: dto.periodo_desde,
        periodo_hasta: dto.periodo_hasta,
        importe_total: dto.importe_total,
        cae,
        cae_vencimiento: caeDueDate,
        estado: 'aprobado',
        pdf_url: null,
      };

      const { data, error } = await client
        .from('afip_comprobantes')
        .insert([record])
        .select()
        .single();

      if (!error && data) {
        return data as ResilientAfipComprobante;
      }
    } catch {
      // Fallback a resilientStore
    }

    // Fallback en memoria
    return resilientStore.addComprobante({
      gestor_id: workspaceId,
      alquiler_id: dto.alquiler_id || null,
      tipo_comprobante: tipoStr,
      tipo_comprobante_codigo: dto.tipo_comprobante_codigo,
      punto_venta: puntoVenta,
      numero_comprobante: 0, // Se autoincrementa en addComprobante
      concepto: dto.concepto || 2,
      cuit_emisor: cuitEmisor,
      receptor_nombre: dto.receptor_nombre,
      receptor_doc_tipo: dto.receptor_doc_tipo,
      receptor_doc_nro: dto.receptor_doc_nro,
      fecha_emision: emisionDate,
      periodo_desde: dto.periodo_desde,
      periodo_hasta: dto.periodo_hasta,
      importe_total: dto.importe_total,
      cae,
      cae_vencimiento: caeDueDate,
      estado: 'aprobado',
      pdf_url: null,
    });
  }

  async findAll(token: string, workspaceId: string): Promise<ResilientAfipComprobante[]> {
    this.assertSandboxOnly();
    try {
      const client = this.supabaseService.getClient(token);
      const { data, error } = await client
        .from('afip_comprobantes')
        .select('*')
        .eq('gestor_id', workspaceId)
        .order('numero_comprobante', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as ResilientAfipComprobante[];
      }
    } catch {
      // Fallback
    }

    return resilientStore.getComprobantes(workspaceId);
  }

  async getPdfBuffer(id: string, token: string, workspaceId: string): Promise<{ buffer: Buffer; filename: string }> {
    this.assertSandboxOnly();
    let comprobante: ResilientAfipComprobante | undefined;

    try {
      const client = this.supabaseService.getClient(token);
      const { data, error } = await client
        .from('afip_comprobantes')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        comprobante = data as ResilientAfipComprobante;
      }
    } catch {
      // Fallback
    }

    if (!comprobante) {
      comprobante = resilientStore.getComprobanteById(id);
    }

    if (!comprobante) {
      throw new NotFoundException(`Comprobante AFIP con ID ${id} no encontrado`);
    }

    const config = await this.getConfig(token, workspaceId);

    const pdfData: AfipComprobanteData = {
      id: comprobante.id,
      tipo_comprobante: comprobante.tipo_comprobante,
      tipo_comprobante_codigo: comprobante.tipo_comprobante_codigo,
      punto_venta: comprobante.punto_venta,
      numero_comprobante: comprobante.numero_comprobante,
      concepto: comprobante.concepto,
      cuit_emisor: comprobante.cuit_emisor,
      gestor_nombre: config?.configurado ? config.razon_social : 'GESTIÓN INMOBILIARIA RENDO',
      razon_social: config?.configurado ? config.razon_social : undefined,
      domicilio_fiscal: config?.configurado ? config.domicilio_fiscal : undefined,
      condicion_iva: config?.configurado ? config.condicion_iva : undefined,
      iibb: config?.configurado ? config.iibb : undefined,
      inicio_actividades: config?.configurado ? config.inicio_actividades : undefined,
      receptor_nombre: comprobante.receptor_nombre,
      receptor_doc_tipo: comprobante.receptor_doc_tipo,
      receptor_doc_nro: comprobante.receptor_doc_nro,
      fecha_emision: comprobante.fecha_emision,
      periodo_desde: comprobante.periodo_desde,
      periodo_hasta: comprobante.periodo_hasta,
      importe_total: Number(comprobante.importe_total),
      cae: comprobante.cae,
      cae_vencimiento: comprobante.cae_vencimiento,
    };

    const buffer = await generateAfipPdfBuffer(pdfData);
    const ptoStr = String(comprobante.punto_venta).padStart(5, '0');
    const nroStr = String(comprobante.numero_comprobante).padStart(8, '0');
    const filename = `AFIP_${comprobante.tipo_comprobante.replace(/\s+/g, '_')}_${ptoStr}-${nroStr}.pdf`;

    return { buffer, filename };
  }
}
