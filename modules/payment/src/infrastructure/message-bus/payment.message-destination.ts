import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';

export const registerPaymentMessageDestinations = (
  registry: MessageDestinationRegistry,
): void => {
  registry.register('PaymentCompletedEvent', {
    exchange: 'payment-exchange',
    routingKey: 'payment.completed',
  });
  registry.register('PaymentFailedEvent', {
    exchange: 'payment-exchange',
    routingKey: 'payment.failed',
  });
};
