import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { InventoryReservation } from '../../domain/reservation/inventory-reservation.entity';

@Injectable()
export class InventoryReservationRepository {
  constructor(
    @InjectRepository(InventoryReservation)
    private readonly repository: EntityRepository<InventoryReservation>,
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<InventoryReservation | null> {
    return await this.repository.findOne({ id });
  }

  async findByOrderId(orderId: string): Promise<InventoryReservation[]> {
    return await this.repository.find({ orderId });
  }

  async save(reservation: InventoryReservation): Promise<void> {
    await this.em.persistAndFlush(reservation);
  }

  async remove(reservation: InventoryReservation): Promise<void> {
    await this.em.removeAndFlush(reservation);
  }
}
