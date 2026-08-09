import { IsEnum, IsOptional } from 'class-validator';

export enum UserStatusFilter {
  Activo = 'activo',
  Inactivo = 'inactivo',
}

export class FindUsersQueryDto {
  @IsOptional()
  @IsEnum(UserStatusFilter, {
    message: 'El status debe ser activo o inactivo',
  })
  status?: UserStatusFilter;
}
