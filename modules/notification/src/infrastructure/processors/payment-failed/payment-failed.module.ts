import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationBroadcasterModule } from '../../realtime/notification-broadcaster.module';
import { PaymentFailedProcessor } from './payment-failed.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationBroadcasterModule,
  ],
  providers: [PaymentFailedProcessor],
  exports: [PaymentFailedProcessor],
})
export class PaymentFailedProcessorModule {}
