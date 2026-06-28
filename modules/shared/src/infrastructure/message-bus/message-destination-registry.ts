import { Injectable, Logger } from '@nestjs/common';

export interface MessageDestination {
  exchange: string;
  routingKey: string;
}

@Injectable()
export class MessageDestinationRegistry {
  static instance: MessageDestinationRegistry;
  private readonly logger = new Logger(MessageDestinationRegistry.name);
  private readonly instanceId = Math.random().toString(36).substring(7);
  private readonly mappings: Map<string, MessageDestination> = new Map();

  constructor() {
    if (!MessageDestinationRegistry.instance) {
      MessageDestinationRegistry.instance = this;
    } else {
      console.log(
        `[MessageDestinationRegistry] [${this.instanceId}] Singleton already exists (${MessageDestinationRegistry.instance.instanceId}).`,
      );
    }
  }

  register(eventType: string, destination: MessageDestination): void {
    if (
      MessageDestinationRegistry.instance &&
      MessageDestinationRegistry.instance !== this
    ) {
      return MessageDestinationRegistry.instance.register(
        eventType,
        destination,
      );
    }
    if (this.mappings.has(eventType)) {
      this.logger.warn(
        `Event type "${eventType}" is already registered. Overwriting mapping.`,
      );
    }
    this.mappings.set(eventType, destination);
  }

  get(eventType: string): MessageDestination | undefined {
    if (
      MessageDestinationRegistry.instance &&
      MessageDestinationRegistry.instance !== this
    ) {
      return MessageDestinationRegistry.instance.get(eventType);
    }
    const destination = this.mappings.get(eventType);
    return destination;
  }
}
