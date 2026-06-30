export class ListNotificationsQuery {
  constructor(
    public readonly orderId?: string,
    public readonly limit: number = 20,
    public readonly offset: number = 0,
  ) {}
}
