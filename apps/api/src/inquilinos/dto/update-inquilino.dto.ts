import { PartialType } from '@nestjs/mapped-types';
import { CreateInquilinoDto } from './create-inquilino.dto.js';

export class UpdateInquilinoDto extends PartialType(CreateInquilinoDto) {}
