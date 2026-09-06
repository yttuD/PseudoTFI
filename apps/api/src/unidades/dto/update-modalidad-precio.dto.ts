import { PartialType } from '@nestjs/mapped-types';
import { CreateModalidadPrecioDto } from './create-modalidad-precio.dto.js';

export class UpdateModalidadPrecioDto extends PartialType(CreateModalidadPrecioDto) {}
