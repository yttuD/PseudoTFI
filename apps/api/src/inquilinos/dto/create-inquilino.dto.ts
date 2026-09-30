import { IsArray, IsBoolean, IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GaranteDto {
  @IsString()
  @IsNotEmpty()
  nombre_completo: string;

  @IsString()
  @IsOptional()
  dni?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

export class CreateInquilinoDto {
  @IsString()
  @IsNotEmpty()
  nombre_completo: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  documento?: string;

  @IsArray()
  @IsOptional()
  garantes?: GaranteDto[];

  @IsBoolean()
  @IsOptional()
  consentimiento_ley25326?: boolean;

  @IsDateString()
  @IsOptional()
  consentimiento_fecha?: string;
}

