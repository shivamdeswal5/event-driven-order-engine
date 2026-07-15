import { Module } from '@nestjs/common';
import { NotificationBroadcaster } from './notification-broadcaster.service';

@Module({
  providers: [NotificationBroadcaster],
  exports: [NotificationBroadcaster],
})
export class NotificationBroadcasterModule {}
