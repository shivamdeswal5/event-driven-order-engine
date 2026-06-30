import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';
import { Payment } from '../../../domain/payment/payment.entity';
import { PaymentRepository } from '../../repository/payment.repository';
import { PaymentStatus } from '../../../domain/payment/enum/payment-status.enum';
import { PaymentCompletedEvent } from '../../../domain/payment/events/payment-completed.event';
import { PaymentFailedEvent } from '../../../domain/payment/events/payment-failed.event';

@Injectable()
export class InventoryReservedProcessor {
  private readonly logger = new Logger(InventoryReservedProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly paymentRepository: PaymentRepository,
    private readonly inboxRepository: InboxMessageRepository,
    private readonly outboxRepository: OutboxMessageRepository,
  ) {}

  getHandlerName(): string {
    return InventoryReservedProcessor.name;
  }

  @Transactional()
  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;
    const totalPrice = Number(payload.totalPrice);
    const schema = process.env.DB_SCHEMA_PAYMENT!;

    this.logger.log(`Processing InventoryReservedEvent for order: ${orderId}`);

    // Deduplicate/Idempotency check
    await this.inboxRepository.storeInboxMessage(
      {
        messageId: message.messageId,
        handlerName: this.getHandlerName(),
        eventType: 'InventoryReservedEvent',
      },
      schema,
    );

    // Check if payment already exists to prevent duplicate processing
    let payment = await this.paymentRepository.findByOrderId(orderId);
    if (payment) {
      this.logger.warn(
        `Payment for order ${orderId} already exists. Skipping.`,
      );
      return;
    }

    // 1. Create payment in PENDING status
    payment = new Payment();
    payment.orderId = orderId;
    payment.amount = totalPrice;
    payment.status = PaymentStatus.PENDING;

    await this.paymentRepository.save(payment);

    // 2. Transition to PROCESSING
    payment.process();
    await this.paymentRepository.save(payment);

    // 3. Simulate payment gateway (Deterministic simulation: fails if amount ends in .99)
    const isFailure = Math.round(totalPrice * 100) % 100 === 99;

    if (isFailure) {
      const reason = 'Insufficient funds (simulated payment failure)';
      payment.fail(reason);
      await this.paymentRepository.save(payment);

      const failedEvent = new PaymentFailedEvent({
        orderId,
        paymentId: payment.id,
        amount: payment.amount,
        reason,
      });
      await this.outboxRepository.storeOutboxMessage(failedEvent, { schema });
      this.logger.warn(`Payment failed for order ${orderId} due to: ${reason}`);
    } else {
      payment.complete();
      await this.paymentRepository.save(payment);

      const completedEvent = new PaymentCompletedEvent({
        orderId,
        paymentId: payment.id,
        amount: payment.amount,
      });
      await this.outboxRepository.storeOutboxMessage(completedEvent, {
        schema,
      });
      this.logger.log(`Payment completed successfully for order ${orderId}`);
    }
  }
}
