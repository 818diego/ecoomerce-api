import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { StockMovementType } from '../enums/stock-movement-type.enum';

@ValidatorConstraint({ name: 'stockMovementFields', async: false })
export class StockMovementFieldsConstraint
  implements ValidatorConstraintInterface
{
  validate(_: unknown, args: ValidationArguments) {
    const dto = args.object as StockMovementDto;

    if (dto.type === StockMovementType.Ajuste) {
      return dto.newStock !== undefined && dto.quantity === undefined;
    }

    if (
      dto.type === StockMovementType.Entrada ||
      dto.type === StockMovementType.Salida
    ) {
      return dto.quantity !== undefined && dto.newStock === undefined;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as StockMovementDto;

    if (dto.type === StockMovementType.Ajuste) {
      return 'Para ajuste debe enviar newStock (stock objetivo) y no quantity';
    }

    return 'Para entrada o salida debe enviar quantity y no newStock';
  }
}

export class StockMovementDto {
  @IsEnum(StockMovementType, {
    message: 'El tipo debe ser entrada, salida o ajuste',
  })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  type: StockMovementType;

  @ValidateIf(
    (dto: StockMovementDto) =>
      dto.type === StockMovementType.Entrada ||
      dto.type === StockMovementType.Salida,
  )
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  quantity?: number;

  @ValidateIf((dto: StockMovementDto) => dto.type === StockMovementType.Ajuste)
  @Type(() => Number)
  @IsInt({ message: 'El stock objetivo debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  newStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Las observaciones no pueden superar 500 caracteres',
  })
  observations?: string;

  @Validate(StockMovementFieldsConstraint)
  private readonly _stockMovementFields?: never;
}
