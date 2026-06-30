import { Module } from '@nestjs/common';
import { ListNotificationsModule } from './list-notifications/list-notifications.module';
import { NotificationGatewayModule } from '../infrastructure/websocket/notification-gateway.module';
import { NotificationMessageDestinationModule } from '../infrastructure/message-bus/notification.message-destination.module';

@Module({
  imports: [
    ListNotificationsModule,
    NotificationGatewayModule,
    NotificationMessageDestinationModule,
  ],
})
export class NotificationModule {}
