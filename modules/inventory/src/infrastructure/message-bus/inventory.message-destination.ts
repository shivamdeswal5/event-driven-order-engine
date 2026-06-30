import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';

export const registerInventoryMessageDestinations = (
  registry: MessageDestinationRegistry,
): void => {
  registry.register('InventoryReservedEvent', {
    exchange: 'inventory-exchange',
    routingKey: 'inventory.reserved',
  });
  registry.register('InventoryReservationFailedEvent', {
    exchange: 'inventory-exchange',
    routingKey: 'inventory.reservation-failed',
  });
  registry.register('InventoryReleasedEvent', {
    exchange: 'inventory-exchange',
    routingKey: 'inventory.released',
  });
};
