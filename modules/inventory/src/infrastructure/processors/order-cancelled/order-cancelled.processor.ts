import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { ProductRepository } from '../../repository/product.repository';
import { InventoryReservationRepository } from '../../repository/inventory-reservation.repository';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';
import { InventoryReleasedEvent } from '../../../domain/reservation/events/inventory-released.event';
import { ReservationStatus } from '../../../domain/reservation/enum/reservation-status.enum';

@Injectable()
export class OrderCancelledProcessor {
  private readonly logger = new Logger(OrderCancelledProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly productRepository: ProductRepository,
    private readonly reservationRepository: InventoryReservationRepository,
    private readonly inboxRepository: InboxMessageRepository,
    private readonly outboxRepository: OutboxMessageRepository,
  ) {}

  getHandlerName(): string {
    return OrderCancelledProcessor.name;
  }

  @Transactional()
  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;
    const schema = process.env.DB_SCHEMA_INVENTORY!;

    this.logger.log(`Processing OrderCancelledEvent for order: ${orderId}`);

    await this.inboxRepository.storeInboxMessage(
      {
        messageId: message.messageId,
        handlerName: this.getHandlerName(),
        eventType: 'OrderCancelledEvent',
      },
      schema,
    );

    const reservations =
      await this.reservationRepository.findByOrderId(orderId);
    const activeReservations = reservations.filter(
      (r) => r.status === ReservationStatus.RESERVED,
    );

    if (activeReservations.length === 0) {
      this.logger.log(
        `No active reservations found to release for order: ${orderId}`,
      );
      return;
    }

    const releasedItems = [];

    for (const reservation of activeReservations) {
      const product = await this.productRepository.findById(
        reservation.productId,
      );
      if (product) {
        product.releaseStock(reservation.quantity);
        await this.productRepository.save(product);
      }

      reservation.release();
      await this.reservationRepository.save(reservation);

      releasedItems.push({
        productId: reservation.productId,
        quantity: reservation.quantity,
      });
    }

    const releasedEvent = new InventoryReleasedEvent({
      orderId,
      items: releasedItems,
    });

    await this.outboxRepository.storeOutboxMessage(releasedEvent, { schema });
    this.logger.log(
      `Successfully released inventory reservations for order ${orderId}`,
    );
  }
}
