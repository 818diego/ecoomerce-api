import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser true o false' })
  active?: boolean;
}
