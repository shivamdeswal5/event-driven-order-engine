import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Notification } from '../../../domain/notification/notification.entity';
import { NotificationGatewayModule } from '../../websocket/notification-gateway.module';
import { InventoryReservedProcessor } from './inventory-reserved.processor';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    NotificationGatewayModule,
  ],
  providers: [InventoryReservedProcessor],
  exports: [InventoryReservedProcessor],
})
export class InventoryReservedProcessorModule {}
