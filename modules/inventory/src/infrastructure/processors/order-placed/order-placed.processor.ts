import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { ProductRepository } from '../../repository/product.repository';
import { InventoryReservationRepository } from '../../repository/inventory-reservation.repository';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';
import { InventoryReservation } from '../../../domain/reservation/inventory-reservation.entity';
import { InventoryReservedEvent } from '../../../domain/product/events/inventory-reserved.event';
import { InventoryReservationFailedEvent } from '../../../domain/product/events/inventory-reservation-failed.event';
import { ProductNotFoundException } from '../../../domain/product/exceptions/product.exceptions';

@Injectable()
export class OrderPlacedProcessor {
  private readonly logger = new Logger(OrderPlacedProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly productRepository: ProductRepository,
    private readonly reservationRepository: InventoryReservationRepository,
    private readonly inboxRepository: InboxMessageRepository,
    private readonly outboxRepository: OutboxMessageRepository,
  ) {}

  getHandlerName(): string {
    return OrderPlacedProcessor.name;
  }

  @Transactional()
  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;
    const items = payload.items;
    const schema = process.env.DB_SCHEMA_INVENTORY!;

    this.logger.log(`Processing OrderPlacedEvent for order: ${orderId}`);

    await this.inboxRepository.storeInboxMessage(
      {
        messageId: message.messageId,
        handlerName: this.getHandlerName(),
        eventType: 'OrderPlacedEvent',
      },
      schema,
    );

    try {
      const reservationsToCreate: InventoryReservation[] = [];
      const productsToUpdate = [];

      for (const item of items) {
        const product = await this.productRepository.findById(item.productId);
        if (!product) {
          throw new ProductNotFoundException(item.productId);
        }

        product.reserveStock(item.quantity);

        const reservation = new InventoryReservation();
        reservation.orderId = orderId;
        reservation.productId = product.id;
        reservation.quantity = item.quantity;

        reservationsToCreate.push(reservation);
        productsToUpdate.push(product);
      }

      for (const product of productsToUpdate) {
        await this.productRepository.save(product);
      }

      for (const res of reservationsToCreate) {
        await this.reservationRepository.save(res);
      }

      const reservedEvent = new InventoryReservedEvent({
        orderId,
        totalPrice: payload.totalPrice,
        items: items.map((i: any) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });

      await this.outboxRepository.storeOutboxMessage(reservedEvent, { schema });
      this.logger.log(`Successfully reserved inventory for order ${orderId}`);
    } catch (error: any) {
      this.logger.warn(
        `Failed to reserve stock for order ${orderId}: ${error.message}`,
      );
      const failedEvent = new InventoryReservationFailedEvent({
        orderId,
        reason: error.message || 'Unknown inventory reservation error',
      });
      await this.outboxRepository.storeOutboxMessage(failedEvent, { schema });
    }
  }
}
