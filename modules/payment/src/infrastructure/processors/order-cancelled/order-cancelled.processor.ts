import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { PaymentRepository } from '../../repository/payment.repository';
import { PaymentStatus } from '../../../domain/payment/enum/payment-status.enum';

@Injectable()
export class OrderCancelledProcessor {
  private readonly logger = new Logger(OrderCancelledProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly paymentRepository: PaymentRepository,
    private readonly inboxRepository: InboxMessageRepository,
  ) {}

  getHandlerName(): string {
    return OrderCancelledProcessor.name;
  }

  @Transactional()
  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;
    const schema = process.env.DB_SCHEMA_PAYMENT!;

    this.logger.log(`Processing OrderCancelledEvent for order: ${orderId}`);

    // Deduplicate/Idempotency check
    await this.inboxRepository.storeInboxMessage(
      {
        messageId: message.messageId,
        handlerName: this.getHandlerName(),
        eventType: 'OrderCancelledEvent',
      },
      schema,
    );

    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      this.logger.log(
        `No payment record found for cancelled order: ${orderId}. Skipping.`,
      );
      return;
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      this.logger.log(`Refunding payment ${payment.id} for order ${orderId}`);
      payment.refund();
      await this.paymentRepository.save(payment);
      this.logger.log(
        `Payment ${payment.id} refunded successfully for order ${orderId}`,
      );
    } else {
      this.logger.log(
        `Payment ${payment.id} for order ${orderId} is in status ${payment.status}, refund not required.`,
      );
    }
  }
}
