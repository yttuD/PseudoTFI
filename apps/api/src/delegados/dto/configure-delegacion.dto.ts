import {
  IsIn,
  IsUUID,
  IsArray,
  ArrayMinSize,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import type { DelegationPermission, DelegationScopeType } from '@tfi/types';

export class ConfigureDelegacionDto {
  @IsNotEmpty({ message: 'El permiso es obligatorio' })
  @IsIn(['ver', 'gestionar'], { message: 'El permiso debe ser ver o gestionar' })
  permiso: DelegationPermission;

  @IsNotEmpty({ message: 'El alcanceTipo es obligatorio' })
  @IsIn(['cuenta', 'grupo', 'unidades'], {
    message: 'El alcanceTipo debe ser cuenta, grupo o unidades',
  })
  alcanceTipo: DelegationScopeType;

  @ValidateIf((o) => o.alcanceTipo === 'grupo')
  @IsNotEmpty({ message: 'grupoId es obligatorio cuando alcanceTipo es grupo' })
  @IsUUID('4', { message: 'grupoId debe ser un UUID válido' })
  grupoId?: string;

  @ValidateIf((o) => o.alcanceTipo === 'unidades')
  @IsNotEmpty({ message: 'unidadIds es obligatorio cuando alcanceTipo es unidades' })
  @IsArray({ message: 'unidadIds debe ser un array' })
  @ArrayMinSize(1, { message: 'unidadIds debe contener al menos un elemento' })
  @IsUUID('4', { each: true, message: 'Cada elemento de unidadIds debe ser un UUID válido' })
  unidadIds?: string[];
}
