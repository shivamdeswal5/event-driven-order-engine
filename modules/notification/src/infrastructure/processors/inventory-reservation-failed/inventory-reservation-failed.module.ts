import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationGatewayModule } from '../../websocket/notification-gateway.module';
import { InventoryReservationFailedProcessor } from './inventory-reservation-failed.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationGatewayModule,
  ],
  providers: [InventoryReservationFailedProcessor],
  exports: [InventoryReservationFailedProcessor],
})
export class InventoryReservationFailedProcessorModule {}
