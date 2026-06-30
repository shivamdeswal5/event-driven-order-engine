import { PaymentStatus } from '../../domain/payment/enum/payment-status.enum';

export class ListPaymentsQuery {
  constructor(
    public readonly status?: PaymentStatus,
    public readonly limit: number = 10,
    public readonly offset: number = 0,
  ) {}
}
