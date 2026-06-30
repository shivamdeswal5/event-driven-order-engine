import { Type } from '@mikro-orm/core';
import { ReservationStatus } from '../enum/reservation-status.enum';

export class ReservationStatusMapper extends Type<ReservationStatus, number> {
  private readonly mapper: Record<ReservationStatus, number> = {
    [ReservationStatus.RESERVED]: 0,
    [ReservationStatus.RELEASED]: 1,
    [ReservationStatus.DEDUCTED]: 2,
  };

  override convertToDatabaseValue(value: ReservationStatus): number {
    return this.mapper[value];
  }

  override convertToJSValue(value: number): ReservationStatus {
    const member = Object.keys(this.mapper).find(
      (key) => this.mapper[key as ReservationStatus] === value,
    ) as ReservationStatus | undefined;

    if (!member) {
      throw new Error(`Unknown ReservationStatus database value: ${value}`);
    }

    return member;
  }

  override getColumnType(): string {
    return 'integer';
  }
}
