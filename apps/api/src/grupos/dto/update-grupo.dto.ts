import { IsString, IsOptional, MaxLength, IsBoolean, IsIn, IsNumber, Min } from 'class-validator';

export class UpdateGrupoDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  sena_default_activa?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['porcentaje', 'monto_fijo'])
  sena_default_tipo?: 'porcentaje' | 'monto_fijo';

  @IsNumber()
  @IsOptional()
  @Min(0)
  sena_default_valor?: number;
}
