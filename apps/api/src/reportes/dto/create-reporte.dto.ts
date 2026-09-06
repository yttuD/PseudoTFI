import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateReporteDto {
  @IsUUID()
  unidad_id: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
