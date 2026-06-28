import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';

export const registerOrderMessageDestinations = (registry: MessageDestinationRegistry) => {
  registry.register('OrderPlacedEvent', {
    exchange: 'order-exchange',
    routingKey: 'order.placed',
  });

  registry.register('OrderCancelledEvent', {
    exchange: 'order-exchange',
    routingKey: 'order.cancelled',
  });
};
