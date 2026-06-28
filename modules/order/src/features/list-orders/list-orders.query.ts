import { OrderStatus } from '../../domain/order/enum/order-status.enum';

export class ListOrdersQuery {
  constructor(
    public readonly status?: OrderStatus,
    public readonly limit: number = 10,
    public readonly offset: number = 0,
  ) {}
}
