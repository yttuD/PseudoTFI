import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAlquilerDto {
  @IsUUID()
  @IsNotEmpty()
  unidad_id: string;

  @IsUUID()
  @IsNotEmpty()
  inquilino_id: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  fecha_inicio: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  fecha_fin: Date;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  monto_total: number;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
