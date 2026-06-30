import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationGatewayModule } from '../../websocket/notification-gateway.module';
import { PaymentFailedProcessor } from './payment-failed.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationGatewayModule,
  ],
  providers: [PaymentFailedProcessor],
  exports: [PaymentFailedProcessor],
})
export class PaymentFailedProcessorModule {}
