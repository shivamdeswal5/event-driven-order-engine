import { Type } from '@mikro-orm/core';
import { PaymentStatus } from '../enum/payment-status.enum';

export class PaymentStatusMapper extends Type<PaymentStatus, number> {
  private readonly mapper: Record<PaymentStatus, number> = {
    [PaymentStatus.PENDING]: 0,
    [PaymentStatus.PROCESSING]: 1,
    [PaymentStatus.COMPLETED]: 2,
    [PaymentStatus.FAILED]: 3,
    [PaymentStatus.REFUNDED]: 4,
  };

  override convertToDatabaseValue(value: PaymentStatus): number {
    return this.mapper[value];
  }

  override convertToJSValue(value: number): PaymentStatus {
    const member = Object.keys(this.mapper).find(
      (key) => this.mapper[key as PaymentStatus] === value,
    ) as PaymentStatus | undefined;

    if (!member) {
      throw new Error(`Unknown PaymentStatus database value: ${value}`);
    }

    return member;
  }

  override getColumnType(): string {
    return 'integer';
  }
}
