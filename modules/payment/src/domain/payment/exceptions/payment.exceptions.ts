import {
  ConflictException,
  NotFoundException,
} from '@shared/infrastructure/http/exceptions/exceptions';

export class PaymentNotFoundException extends NotFoundException {
  constructor(orderIdOrPaymentId: string) {
    super(`Payment for ID/OrderId '${orderIdOrPaymentId}' not found.`);
  }
}

export class InvalidPaymentStateException extends ConflictException {
  constructor(paymentId: string, currentState: string, action: string) {
    super(
      `Cannot perform action '${action}' on payment ${paymentId} in state '${currentState}'.`,
    );
  }
}

export class PaymentAlreadyExistsException extends ConflictException {
  constructor(orderId: string) {
    super(`Payment for order '${orderId}' already exists.`);
  }
}
