import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum ProductStatusFilter {
  Active = 'active',
  Inactive = 'inactive',
}

export class FindProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ProductStatusFilter, {
    message: 'El status debe ser active o inactive',
  })
  status?: ProductStatusFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID de categoría debe ser un número entero' })
  @Min(1, { message: 'El ID de categoría debe ser mayor a 0' })
  categoryId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
