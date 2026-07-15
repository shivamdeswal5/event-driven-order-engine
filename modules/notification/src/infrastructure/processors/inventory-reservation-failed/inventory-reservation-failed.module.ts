import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationBroadcasterModule } from '../../realtime/notification-broadcaster.module';
import { InventoryReservationFailedProcessor } from './inventory-reservation-failed.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationBroadcasterModule,
  ],
  providers: [InventoryReservationFailedProcessor],
  exports: [InventoryReservationFailedProcessor],
})
export class InventoryReservationFailedProcessorModule {}
