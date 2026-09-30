import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUnidadDto {
  @IsString()
  @IsNotEmpty()
  categoria: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  zona_id?: number;

  @IsOptional()
  @IsUUID()
  grupo_id?: string;

  @IsOptional()
  @IsString()
  titulo_es?: string;

  @IsOptional()
  @IsString()
  descripcion_es?: string;

  @IsOptional()
  @IsString()
  titulo_en?: string;

  @IsOptional()
  @IsString()
  descripcion_en?: string;

  @IsOptional()
  @IsString()
  titulo_pt?: string;

  @IsOptional()
  @IsString()
  descripcion_pt?: string;

  @IsOptional()
  @IsBoolean()
  auto_traducir?: boolean;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  instagram?: string;
}
