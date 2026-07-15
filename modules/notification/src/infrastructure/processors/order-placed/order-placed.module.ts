import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationBroadcasterModule } from '../../realtime/notification-broadcaster.module';
import { OrderPlacedProcessor } from './order-placed.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationBroadcasterModule,
  ],
  providers: [OrderPlacedProcessor],
  exports: [OrderPlacedProcessor],
})
export class OrderPlacedProcessorModule {}
