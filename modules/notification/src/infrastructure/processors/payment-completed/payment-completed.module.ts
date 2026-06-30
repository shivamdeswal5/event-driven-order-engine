import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationGatewayModule } from '../../websocket/notification-gateway.module';
import { PaymentCompletedProcessor } from './payment-completed.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationGatewayModule,
  ],
  providers: [PaymentCompletedProcessor],
  exports: [PaymentCompletedProcessor],
})
export class PaymentCompletedProcessorModule {}
