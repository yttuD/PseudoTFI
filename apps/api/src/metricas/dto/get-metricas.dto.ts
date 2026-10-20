import { IsOptional, IsString } from 'class-validator';

export class GetMetricasDto {
  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @IsOptional()
  @IsString()
  dias?: string;

  @IsOptional()
  @IsString()
  unidad_id?: string;

  @IsOptional()
  @IsString()
  zona_id?: string;
}
