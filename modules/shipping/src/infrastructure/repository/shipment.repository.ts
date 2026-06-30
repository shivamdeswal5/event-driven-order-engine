import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Shipment } from '../../domain/shipment/shipment.entity';
import { ShipmentStatus } from '../../domain/shipment/enum/shipment-status.enum';

@Injectable()
export class ShipmentRepository {
  constructor(
    @InjectRepository(Shipment)
    private readonly repository: EntityRepository<Shipment>,
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<Shipment | null> {
    return await this.repository.findOne({ id });
  }

  async findByOrderId(orderId: string): Promise<Shipment | null> {
    return await this.repository.findOne({ orderId });
  }

  async findAll(filter?: { status?: ShipmentStatus }): Promise<Shipment[]> {
    const query: any = {};
    if (filter?.status) {
      query.status = filter.status;
    }
    return await this.repository.find(query, {
      orderBy: { createdAt: 'DESC' },
    });
  }

  async save(shipment: Shipment): Promise<void> {
    await this.em.persistAndFlush(shipment);
  }

  async remove(shipment: Shipment): Promise<void> {
    await this.em.removeAndFlush(shipment);
  }
}
