import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateModalidadPrecioDto {
  @IsString()
  @IsNotEmpty()
  unidad_tiempo: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  cantidad_tiempo: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precio: number;
}
