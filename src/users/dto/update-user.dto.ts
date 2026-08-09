import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../enums/role.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  correo?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  contrasena?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'El rol debe ser administrador, manager o usuario' })
  rol?: Role;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser true o false' })
  activo?: boolean;
}
