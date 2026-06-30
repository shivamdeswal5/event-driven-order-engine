import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationGatewayModule } from '../../websocket/notification-gateway.module';
import { OrderCancelledProcessor } from './order-cancelled.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationGatewayModule,
  ],
  providers: [OrderCancelledProcessor],
  exports: [OrderCancelledProcessor],
})
export class OrderCancelledProcessorModule {}
