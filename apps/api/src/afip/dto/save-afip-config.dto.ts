import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

export class SaveAfipConfigDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'El CUIT debe contener exactamente 11 dígitos numéricos sin guiones' })
  cuit: string;

  @IsString()
  @IsNotEmpty({ message: 'La Razón Social o Nombre Fiscal es requerida' })
  razon_social: string;

  @IsString()
  @IsIn(['monotributo', 'responsable_inscripto', 'exento'], {
    message: 'La condición de IVA debe ser monotributo, responsable_inscripto o exento',
  })
  condicion_iva: 'monotributo' | 'responsable_inscripto' | 'exento';

  @IsInt({ message: 'El punto de venta debe ser un número entero' })
  @Min(1, { message: 'El punto de venta debe ser mayor o igual a 1' })
  punto_venta: number;

  @IsOptional()
  @IsString()
  iibb?: string;

  @IsOptional()
  @IsString()
  inicio_actividades?: string;

  @IsString()
  @IsNotEmpty({ message: 'El domicilio fiscal es requerido' })
  domicilio_fiscal: string;

  @IsOptional()
  @IsIn(['homologacion', 'produccion'])
  entorno?: 'homologacion' | 'produccion';
}
