import { PartialType } from '@nestjs/mapped-types';
import { CreateAlquilerDto } from './create-alquiler.dto.js';
import { IsEnum, IsOptional } from 'class-validator';

export enum EstadoAlquiler {
  ACTIVO = 'activo',
  FINALIZADO = 'finalizado',
  CANCELADO = 'cancelado',
}

export class UpdateAlquilerDto extends PartialType(CreateAlquilerDto) {
  @IsEnum(EstadoAlquiler)
  @IsOptional()
  estado?: EstadoAlquiler;
}
