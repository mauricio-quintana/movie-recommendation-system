import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, {
  type Channel,
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from 'amqplib';
import { assertTopology } from './rabbitmq.topology.js';

const CONNECT_ATTEMPTS = 10;
const CONNECT_RETRY_MS = 3_000;

export interface PublishOptions {
  messageId: string;
  type: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Worker-side RabbitMQ connection: a confirm channel for publishing and a
 * separate channel for consuming. A lost connection terminates the process so
 * the orchestrator restarts it with a clean state (unacked messages are redelivered).
 */
@Injectable()
export class RabbitMqService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection: ChannelModel | null = null;
  private publishChannel: ConfirmChannel | null = null;
  private consumeChannel: Channel | null = null;
  private shuttingDown = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.connection = await this.connect();

    this.connection.on('error', (error: Error) =>
      this.logger.error(`AMQP error: ${error.message}`),
    );
    this.connection.on('close', () => {
      if (!this.shuttingDown) {
        this.logger.error(
          'AMQP connection lost, exiting so the worker is restarted',
        );
        process.exit(1);
      }
    });

    this.publishChannel = await this.connection.createConfirmChannel();
    this.consumeChannel = await this.connection.createChannel();

    await assertTopology(this.publishChannel);
  }

  /**
   * Resolves only once the broker confirms the message (publisher confirms).
   */
  publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options: PublishOptions,
  ): Promise<void> {
    const channel = this.requireChannel(this.publishChannel);

    return new Promise((resolve, reject) => {
      channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: options.messageId,
          type: options.type,
          timestamp: Math.floor(Date.now() / 1000),
        },
        (error: unknown) =>
          error
            ? reject(new Error('Broker did not confirm the message'))
            : resolve(),
      );
    });
  }

  /**
   * Manual-ACK consumer. The handler must ack/nack every message.
   */
  async consume(
    queue: string,
    prefetch: number,
    handler: (message: ConsumeMessage, channel: Channel) => Promise<void>,
  ): Promise<string> {
    const channel = this.requireChannel(this.consumeChannel);
    await channel.prefetch(prefetch);

    const { consumerTag } = await channel.consume(
      queue,
      (message) => {
        if (message) {
          void handler(message, channel);
        }
      },
      { noAck: false },
    );

    return consumerTag;
  }

  async cancel(consumerTag: string): Promise<void> {
    await this.consumeChannel?.cancel(consumerTag);
  }

  async onApplicationShutdown() {
    this.shuttingDown = true;
    await this.connection?.close().catch(() => undefined);
  }

  private async connect(): Promise<ChannelModel> {
    const url = this.config.getOrThrow<string>('RABBITMQ_URL');

    for (let attempt = 1; ; attempt++) {
      try {
        return await amqp.connect(url, {
          clientProperties: { connection_name: 'recommendation-worker' },
        });
      } catch (error) {
        if (attempt >= CONNECT_ATTEMPTS) {
          throw error;
        }

        this.logger.warn(
          `RabbitMQ not reachable (attempt ${attempt}), retrying`,
        );
        await sleep(CONNECT_RETRY_MS);
      }
    }
  }

  private requireChannel<T>(channel: T | null): T {
    if (!channel) {
      throw new Error('RabbitMQ is not connected');
    }

    return channel;
  }
}
