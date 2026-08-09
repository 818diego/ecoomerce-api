import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../enums/role.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correo: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  contrasena: string;

  @IsEnum(Role, { message: 'El rol debe ser administrador, manager o usuario' })
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  rol: Role;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser true o false' })
  activo?: boolean;
}
