import { Role } from '../../users/enums/role.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
}
