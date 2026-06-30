import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RabbitmqConfigService } from './rabbitmq-config.service';
import * as RabbitMQ from 'amqplib';
import { EventEmitter } from 'events';
import { jsonrepair } from 'jsonrepair';
import {
  ConfigType,
  QueueConfig,
  RabbitMQPublishMessage,
} from '../rabbitmq.interface';

@Injectable()
export class RabbitmqConnectionService implements OnModuleDestroy {
  public rabbitMqEvents = new EventEmitter();
  private channel!: any;
  private connection!: any;
  private maxReconnectTries = 3;
  private isMaxReconnectPolicyApplied = false;
  private reconnectTries = 0;
  private timeout: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(private readonly rabbitMQConfigService: RabbitmqConfigService) {
    const { maxReconnectTries, reconnectPolicy } =
      this.rabbitMQConfigService.getMaxReconnectTrialsData();
    this.rabbitMQConfigService.validateConfig();
    this.maxReconnectTries = reconnectPolicy ? maxReconnectTries || 3 : 0;
    this.isMaxReconnectPolicyApplied = reconnectPolicy;
  }

  private get config(): ConfigType {
    return this.rabbitMQConfigService.getConfig();
  }

  async connect() {
    try {
      if (this.timeout) clearTimeout(this.timeout);
      this.connection = await this.createConnection();

      this.connection.on('close', this.handleClose.bind(this));
      this.connection.on('error', this.handleError.bind(this));
      console.log('RabbitMQ is connected.');

      this.channel = await this.createChannel();

      this.rabbitMqEvents.emit('connected');
      this.reconnectTries = 0;
    } catch (error: any) {
      console.log(
        `Failed to establish connection to RabbitMQ: ${error.message || error}`,
      );
      await this.reconnect();
    }
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.timeout) clearTimeout(this.timeout);
    await this.closeChannel();
    if (this.connection) {
      try {
        await this.connection.close();
        console.log('RabbitMQ connection closed gracefully.');
      } catch (err) {
        // ignore
      }
    }
  }

  getConnectionConfiguration() {
    return this.config;
  }

  async exchange(exchange: string, exchangeType: string) {
    await this.channel?.assertExchange(exchange, exchangeType, {
      durable: true,
    });
  }

  async queue(
    exchange: string,
    queue: string,
    options: QueueConfig,
    routingKey = '',
  ) {
    await this.channel?.assertQueue(queue, options as any);
    await this.channel?.bindQueue(queue, exchange, routingKey);
  }

  async createConnection() {
    const connectionString = this.rabbitMQConfigService.getConnectionString();
    const connectionParams = this.rabbitMQConfigService.getConnectionParams();
    return RabbitMQ.connect(connectionString, connectionParams as any) as any;
  }

  getChannel() {
    return this.channel;
  }

  async createChannel() {
    if (!this.connection)
      throw new Error('RabbitMQ connection has not been established yet.');
    const channel = await this.connection.createChannel();
    return channel;
  }

  async closeChannel() {
    if (this.channel) {
      try {
        await this.channel.close();
        console.log('Channel closed explicitly.');
      } catch (err) {
        // ignore
      }
      this.channel = null as any;
    }
  }

  async publish(message: RabbitMQPublishMessage) {
    const { exchange, bindingKey, content, properties } = message;
    return this.channel?.publish(
      exchange,
      bindingKey,
      Buffer.from(content),
      properties,
    );
  }

  async deadLetter(message: RabbitMQ.Message, error: Array<Error>) {
    const { payload, headers } = this.convertToPoisonMessageFormat(
      message,
      error,
    );
    console.log(
      `ERROR RecoverabilityExecutor Moving message ${message?.properties?.messageId} to error queue because processing failed due to an exception:\n`,
      error,
    );

    const messageToPublish: RabbitMQPublishMessage = {
      exchange: this.config.errorQueueExchange || 'error-exchange',
      bindingKey: this.config.errorQueueRoutingKey || 'error-route',
      content: JSON.stringify(payload),
      properties: { ...message.properties, headers: headers, persistent: true },
    };
    return this.publish(messageToPublish);
  }

  private convertToPoisonMessageFormat(
    message: RabbitMQ.Message,
    errors: Array<Error>,
  ) {
    const parsedMessage = this.robustParseMessageContent(message);
    const properties = message?.properties || {};
    const headers = properties.headers || {};
    return {
      payload: parsedMessage,
      headers: {
        ...headers,
        exception_details: errors?.map((error) => ({
          exception_type: error.message,
          stack_trace: error.stack,
          failed_at: new Date().toISOString(),
        })),
        endpoint: {
          name: this.config.appName,
          delivery_metadata: {
            message_type: properties.type || headers.type,
            exchange: message.fields.exchange,
            routing_key: message.fields.routingKey,
          },
        },
      },
    };
  }

  async retry(message: RabbitMQ.Message, error: Array<Error>) {
    const messageProperties = this.updateMessageHeadersForRetry(message);

    console.log(
      `WARN RecoverabilityExecutor Delayed Retries will reschedule message ${message.properties.messageId} after a delay of 
       ${message.properties.expiration / 1000} seconds because of exception:\n`,
      error,
    );

    const messageToPublish: RabbitMQPublishMessage = {
      exchange: this.config.retryQueueExchange || 'retry-exchange',
      bindingKey: this.config.retryQueueBindingKey || 'retry-route',
      content: message.content.toString(),
      properties: {
        ...messageProperties,
        persistent: true,
      },
    };
    return this.publish(messageToPublish);
  }

  private updateMessageHeadersForRetry(message: RabbitMQ.Message) {
    const properties = message.properties || {};
    if (!properties.headers) properties.headers = {};
    const redeliveryCount = parseInt(
      properties.headers['redelivery_count'] || 0,
      10,
    );
    properties.headers['redelivery_count'] = redeliveryCount + 1;
    properties.headers['retry_endpoint'] = this.config.appName;
    properties.expiration = String((redeliveryCount + 1) * 2000);
    return properties;
  }

  private async handleClose() {
    if (this.isShuttingDown) return;
    console.log('Disconnected from RabbitMQ');
    if (this.timeout) clearTimeout(this.timeout);
    await this.reconnect();
  }

  private async handleError(error: Error) {
    if (this.isShuttingDown) return;
    console.log('Error in RabbitMQ connection', error);
    if (this.timeout) clearTimeout(this.timeout);
    await this.reconnect();
  }

  private async reconnect() {
    return new Promise<void>((resolve) => {
      this.timeout = setTimeout(async () => {
        console.log('Retries', this.reconnectTries);
        this.reconnectTries++;

        if (
          this.isMaxReconnectPolicyApplied &&
          this.hasExceededMaxReconnects(this.reconnectTries)
        ) {
          console.log('Maximum reconnect tries reached, Process exited');
          process.exit(1);
        }

        console.log(
          'Reconnecting to RabbitMQ...',
          'Attempt:',
          this.reconnectTries,
          new Date(),
        );
        await this.connect();

        resolve();
      }, 5000);
    });
  }

  private hasExceededMaxReconnects(reconnectTries: number) {
    return reconnectTries > this.maxReconnectTries;
  }

  robustParseMessageContent(message: RabbitMQ.Message) {
    try {
      return JSON.parse(message.content.toString());
    } catch (err) {
      console.warn('WARNING: Failed to parse message content initially');
      return this.repairMessageContent(message);
    }
  }

  private repairMessageContent(message: RabbitMQ.Message) {
    try {
      const repairedMessage = jsonrepair(message?.content?.toString() || '{}');
      return JSON.parse(repairedMessage);
    } catch (repairError) {
      console.error(
        `ERROR: Failed to repair and parse message ${message?.properties?.messageId}. Content:`,
        message?.content?.toString(),
        'Repair error details:',
        repairError,
      );
      return {};
    }
  }
}
