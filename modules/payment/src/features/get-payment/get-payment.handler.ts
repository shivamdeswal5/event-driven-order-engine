import { Injectable } from '@nestjs/common';
import { Payment } from '../../domain/payment/payment.entity';
import { GetPaymentQuery } from './get-payment.query';
import { PaymentRepository } from '../../infrastructure/repository/payment.repository';
import { PaymentNotFoundException } from '../../domain/payment/exceptions/payment.exceptions';

@Injectable()
export class GetPaymentHandler {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async handle(query: GetPaymentQuery): Promise<Payment> {
    const payment = await this.paymentRepository.findByOrderId(query.orderId);
    if (!payment) {
      throw new PaymentNotFoundException(query.orderId);
    }
    return payment;
  }
}
