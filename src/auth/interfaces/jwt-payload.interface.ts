import { Role } from '../../users/enums/role.enum';

export interface JwtPayload {
  sub: number;
  correo: string;
  rol: Role;
}

export interface AuthenticatedUser {
  id: number;
  correo: string;
  rol: Role;
}