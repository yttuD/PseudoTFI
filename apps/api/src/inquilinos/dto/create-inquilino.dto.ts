import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
