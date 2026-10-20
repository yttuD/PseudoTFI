import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFavoritoDto {
  @IsString()
  @IsNotEmpty()
  unidad_id: string;
}
