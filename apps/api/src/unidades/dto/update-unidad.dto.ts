import { IsInt, IsObject, IsOptional, IsString, IsUUID, IsNotEmpty, IsArray, ArrayMaxSize, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { CreateUnidadDto } from './create-unidad.dto.js';

export class UpdateUnidadDto extends PartialType(CreateUnidadDto) {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoria?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  zona_id?: number;

  @IsOptional()
  @IsUUID()
  grupo_id?: string;

  @IsOptional()
  @IsObject()
  atributos?: Record<string, any>;

  @IsOptional()
  @IsString()
  titulo_es?: string;

  @IsOptional()
  @IsString()
  titulo_pt?: string;

  @IsOptional()
  @IsString()
  titulo_en?: string;

  @IsOptional()
  @IsString()
  descripcion_es?: string;

  @IsOptional()
  @IsString()
  descripcion_pt?: string;

  @IsOptional()
  @IsString()
  descripcion_en?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  fotos?: string[];

  @IsOptional()
  @IsObject()
  ubicacion_aprox?: { lat: number; lng: number };

  @IsOptional()
  @IsObject()
  ubicacion_exacta?: { lat: number; lng: number };

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsBoolean()
  auto_traducir?: boolean;
}
