import { IsUUID } from 'class-validator';

export class CreateFavoritoDto {
  @IsUUID()
  unidad_id: string;
}
