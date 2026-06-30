import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';

export const registerShippingMessageDestinations = (
  registry: MessageDestinationRegistry,
): void => {
  registry.register('ShipmentCreatedEvent', {
    exchange: 'shipping-exchange',
    routingKey: 'shipping.created',
  });
  registry.register('ShipmentDeliveredEvent', {
    exchange: 'shipping-exchange',
    routingKey: 'shipping.delivered',
  });
};
