import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationBroadcasterModule } from '../../realtime/notification-broadcaster.module';
import { ShipmentCreatedProcessor } from './shipment-created.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationBroadcasterModule,
  ],
  providers: [ShipmentCreatedProcessor],
  exports: [ShipmentCreatedProcessor],
})
export class ShipmentCreatedProcessorModule {}
