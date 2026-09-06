import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
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
  whatsapp?: string;

  @IsOptional()
  @IsString()
  instagram?: string;
}
