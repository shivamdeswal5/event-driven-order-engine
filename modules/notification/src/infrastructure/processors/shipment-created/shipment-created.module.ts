import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationGatewayModule } from '../../websocket/notification-gateway.module';
import { ShipmentCreatedProcessor } from './shipment-created.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationGatewayModule,
  ],
  providers: [ShipmentCreatedProcessor],
  exports: [ShipmentCreatedProcessor],
})
export class ShipmentCreatedProcessorModule {}
