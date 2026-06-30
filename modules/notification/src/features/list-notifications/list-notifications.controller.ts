import { Controller, Get, Query } from '@nestjs/common';
import { ListNotificationsDto } from './list-notifications.dto';
import { ListNotificationsQuery } from './list-notifications.query';
import { ListNotificationsHandler } from './list-notifications.handler';

@Controller('notifications')
export class ListNotificationsController {
  constructor(
    private readonly listNotificationsHandler: ListNotificationsHandler,
  ) {}

  @Get()
  async listNotifications(@Query() dto: ListNotificationsDto) {
    const query = new ListNotificationsQuery(
      dto.orderId,
      dto.limit,
      dto.offset,
    );
    return await this.listNotificationsHandler.handle(query);
  }
}
