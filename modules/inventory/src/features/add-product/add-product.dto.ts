import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AddProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}
