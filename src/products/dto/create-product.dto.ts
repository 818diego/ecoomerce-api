import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(150, { message: 'El nombre no puede superar 150 caracteres' })
  name: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número válido' },
  )
  @IsNotEmpty({ message: 'El precio es obligatorio' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;

  @IsInt({ message: 'El ID de categoría debe ser un número entero' })
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @Min(1, { message: 'El ID de categoría debe ser mayor a 0' })
  categoryId: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El SKU no puede superar 50 caracteres' })
  sku?: string;

  @IsOptional()
  @IsUrl({}, { message: 'La URL de imagen no es válida' })
  @MaxLength(500, { message: 'La URL de imagen no puede superar 500 caracteres' })
  imageUrl?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser true o false' })
  active?: boolean;
}
