import { IsEnum, IsOptional } from 'class-validator';

export enum CategoryStatusFilter {
  Active = 'active',
  Inactive = 'inactive',
}

export class FindCategoriesQueryDto {
  @IsOptional()
  @IsEnum(CategoryStatusFilter, {
    message: 'El status debe ser active o inactive',
  })
  status?: CategoryStatusFilter;
}
