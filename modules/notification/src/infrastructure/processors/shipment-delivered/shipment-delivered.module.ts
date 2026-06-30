import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationGatewayModule } from '../../websocket/notification-gateway.module';
import { ShipmentDeliveredProcessor } from './shipment-delivered.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationGatewayModule,
  ],
  providers: [ShipmentDeliveredProcessor],
  exports: [ShipmentDeliveredProcessor],
})
export class ShipmentDeliveredProcessorModule {}
