import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationGatewayModule } from '../../websocket/notification-gateway.module';
import { OrderPlacedProcessor } from './order-placed.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationGatewayModule,
  ],
  providers: [OrderPlacedProcessor],
  exports: [OrderPlacedProcessor],
})
export class OrderPlacedProcessorModule {}
