import { ConflictException } from '@shared/infrastructure/http/exceptions/exceptions';

export class InvalidReservationStateException extends ConflictException {
  constructor(reservationId: string, currentState: string, action: string) {
    super(
      `Cannot perform action '${action}' on reservation ${reservationId} in state '${currentState}'.`,
    );
  }
}
