import { IsEnum, IsOptional } from 'class-validator';

export enum UserStatusFilter {
  Active = 'active',
  Inactive = 'inactive',
}

export class FindUsersQueryDto {
  @IsOptional()
  @IsEnum(UserStatusFilter, {
    message: 'El status debe ser active o inactive',
  })
  status?: UserStatusFilter;
}
