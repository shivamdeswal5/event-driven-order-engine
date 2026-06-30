import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@shared/domain/base.entity';
import { PaymentStatus } from './enum/payment-status.enum';
import { PaymentStatusMapper } from './enum-mapper/payment-status-mapper';
import { InvalidPaymentStateException } from './exceptions/payment.exceptions';

@Entity({ tableName: 'payments', schema: process.env.DB_SCHEMA_PAYMENT })
export class Payment extends BaseEntity {
  @Property({ type: 'uuid' })
  @Unique()
  orderId!: string;

  @Property({ type: 'decimal' })
  amount!: number;

  @Property({ type: 'varchar(3)', default: 'USD' })
  currency: string = 'USD';

  @Property({ type: PaymentStatusMapper, default: 0 })
  status: PaymentStatus = PaymentStatus.PENDING;

  @Property({ type: 'varchar(500)', nullable: true })
  failureReason?: string | null;

  @Property({ type: 'timestamp', nullable: true })
  processedAt?: Date | null;

  process() {
    if (this.status !== PaymentStatus.PENDING) {
      throw new InvalidPaymentStateException(this.id, this.status, 'process');
    }
    this.status = PaymentStatus.PROCESSING;
  }

  complete() {
    if (this.status !== PaymentStatus.PROCESSING) {
      throw new InvalidPaymentStateException(this.id, this.status, 'complete');
    }
    this.status = PaymentStatus.COMPLETED;
    this.processedAt = new Date();
  }

  fail(reason: string) {
    if (this.status !== PaymentStatus.PROCESSING) {
      throw new InvalidPaymentStateException(this.id, this.status, 'fail');
    }
    this.status = PaymentStatus.FAILED;
    this.failureReason = reason;
    this.processedAt = new Date();
  }

  refund() {
    if (this.status !== PaymentStatus.COMPLETED) {
      throw new InvalidPaymentStateException(this.id, this.status, 'refund');
    }
    this.status = PaymentStatus.REFUNDED;
  }
}
