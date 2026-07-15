import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationBroadcasterModule } from '../../realtime/notification-broadcaster.module';
import { ShipmentDeliveredProcessor } from './shipment-delivered.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationBroadcasterModule,
  ],
  providers: [ShipmentDeliveredProcessor],
  exports: [ShipmentDeliveredProcessor],
})
export class ShipmentDeliveredProcessorModule {}
