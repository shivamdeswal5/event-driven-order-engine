import {
  ConflictException,
  NotFoundException,
} from '@shared/infrastructure/http/exceptions/exceptions';

export class ShipmentNotFoundException extends NotFoundException {
  constructor(orderIdOrShipmentId: string) {
    super(`Shipment for ID/OrderId '${orderIdOrShipmentId}' not found.`);
  }
}

export class InvalidShipmentStateException extends ConflictException {
  constructor(shipmentId: string, currentState: string, action: string) {
    super(
      `Cannot perform action '${action}' on shipment ${shipmentId} in state '${currentState}'.`,
    );
  }
}

export class ShipmentAlreadyExistsException extends ConflictException {
  constructor(orderId: string) {
    super(`Shipment for order '${orderId}' already exists.`);
  }
}
