import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationBroadcasterModule } from '../../realtime/notification-broadcaster.module';
import { PaymentCompletedProcessor } from './payment-completed.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationBroadcasterModule,
  ],
  providers: [PaymentCompletedProcessor],
  exports: [PaymentCompletedProcessor],
})
export class PaymentCompletedProcessorModule {}
