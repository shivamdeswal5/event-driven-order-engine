import { IsNotEmpty, IsString } from 'class-validator';

export class ShipShipmentDto {
  @IsNotEmpty()
  @IsString()
  carrier!: string;

  @IsNotEmpty()
  @IsString()
  trackingNumber!: string;
}
