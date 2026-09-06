import { IsOptional, IsInt, IsString, IsIn, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BuscarUnidadesDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  zona_id?: number;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  precio_min?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  precio_max?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  capacidad?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['es', 'pt', 'en'])
  locale?: 'es' | 'pt' | 'en' = 'es';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
