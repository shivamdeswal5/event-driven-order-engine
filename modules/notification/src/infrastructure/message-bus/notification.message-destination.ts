import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';

export const registerNotificationMessageDestinations = (
  registry: MessageDestinationRegistry,
): void => {
  // Notification is a terminal consumer and does not publish events.
  // No registrations needed.
};
