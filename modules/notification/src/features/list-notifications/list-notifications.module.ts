import { Module } from '@nestjs/common';
import { ListNotificationsController } from './list-notifications.controller';
import { ListNotificationsHandler } from './list-notifications.handler';

@Module({
  controllers: [ListNotificationsController],
  providers: [ListNotificationsHandler],
  exports: [ListNotificationsHandler],
})
export class ListNotificationsModule {}
