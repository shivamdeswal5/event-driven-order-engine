import { IsInt } from 'class-validator';

export class UpdateStockDto {
  @IsInt()
  adjustment!: number;
}
