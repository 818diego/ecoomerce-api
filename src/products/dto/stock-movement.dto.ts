import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { StockMovementType } from '../enums/stock-movement-type.enum';

export class StockMovementDto {
  @IsEnum(StockMovementType, {
    message: 'El tipo debe ser entrada, salida o ajuste',
  })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  type: StockMovementType;

  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las observaciones no pueden superar 500 caracteres' })
  observations?: string;
}
