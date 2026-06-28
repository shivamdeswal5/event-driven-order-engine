import { DomainException } from '@shared/infrastructure/http/exceptions/exceptions';

export class OrderNotFoundException extends DomainException {
  constructor(public readonly orderId: string) {
    super(`Order with ID ${orderId} was not found.`);
  }
}

export class InvalidOrderStateException extends DomainException {
  constructor(public readonly orderId: string, public readonly currentState: string, public readonly action: string) {
    super(`Cannot perform action '${action}' on order ${orderId} in state '${currentState}'.`);
  }
}
