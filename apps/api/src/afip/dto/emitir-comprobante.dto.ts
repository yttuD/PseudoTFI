import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class EmitirComprobanteDto {
  @IsInt()
  @IsIn([6, 11, 15])
  tipo_comprobante_codigo: number; // 11: Factura C, 15: Recibo C, 6: Factura B

  @IsInt()
  @Min(1)
  punto_venta: number;

  @IsOptional()
  @IsString()
  alquiler_id?: string;

  @IsString()
  @IsNotEmpty()
  receptor_nombre: string;

  @IsString()
  @IsIn(['DNI', 'CUIT'])
  receptor_doc_tipo: string;

  @IsString()
  @IsNotEmpty()
  receptor_doc_nro: string;

  @IsInt()
  @IsOptional()
  concepto?: number; // 2: Servicios por defecto

  @IsDateString()
  @IsNotEmpty()
  periodo_desde: string;

  @IsDateString()
  @IsNotEmpty()
  periodo_hasta: string;

  @IsNumber()
  @IsPositive()
  importe_total: number;

  @IsOptional()
  @IsString()
  cuit_emisor?: string;
}
