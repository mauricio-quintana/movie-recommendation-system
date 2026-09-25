import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { Channel, ConsumeMessage } from 'amqplib';
import { RabbitMqService } from '../../infrastructure/rabbitmq/rabbitmq.service.js';
import { Topology } from '../../infrastructure/rabbitmq/rabbitmq.topology.js';
import type { GenerateRecommendationPayload } from '../recommendation.events.js';
import { RecommendationProcessor } from './recommendation.processor.js';

const REQUEUE_DELAY_MS = 5_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function parseGenerateMessage(
  content: Buffer,
): GenerateRecommendationPayload | null {
  try {
    const payload = JSON.parse(
      content.toString('utf8'),
    ) as Partial<GenerateRecommendationPayload>;

    return typeof payload?.recommendationId === 'string' &&
      UUID_PATTERN.test(payload.recommendationId)
      ? { recommendationId: payload.recommendationId }
      : null;
  } catch {
    return null;
  }
}

/**
 * Manual ACK, prefetch 1. A message is acked only after its outcome is persisted.
 */
@Injectable()
export class RecommendationConsumer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(RecommendationConsumer.name);
  private consumerTag: string | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly rabbit: RabbitMqService,
    private readonly processor: RecommendationProcessor,
  ) {}

  async onApplicationBootstrap() {
    this.consumerTag = await this.rabbit.consume(
      Topology.recommendationQueue,
      1,
      (message, channel) => this.track(this.handle(message, channel)),
    );

    this.logger.log(`Consuming ${Topology.recommendationQueue}`);
  }

  async onApplicationShutdown() {
    if (this.consumerTag) {
      await this.rabbit.cancel(this.consumerTag).catch(() => undefined);
    }

    await this.inFlight;
  }

  async handle(message: ConsumeMessage, channel: Channel): Promise<void> {
    const payload = parseGenerateMessage(message.content);

    if (!payload) {
      this.logger.warn(
        `Unprocessable message ${message.properties.messageId ?? ''}, dead-lettering`,
      );
      channel.nack(message, false, false);
      return;
    }

    try {
      const outcome = await this.processor.process(payload.recommendationId);

      if (outcome === 'ack') {
        channel.ack(message);
      } else {
        channel.nack(message, false, false);
      }
    } catch (error) {
      // Transient infrastructure failure: requeue after a pause. The quorum queue
      // delivery limit dead-letters messages that keep failing.
      this.logger.error(
        `Processing ${payload.recommendationId} failed: ${(error as Error).message}`,
      );
      await sleep(REQUEUE_DELAY_MS);
      channel.nack(message, false, true);
    }
  }

  private track(work: Promise<void>): Promise<void> {
    this.inFlight = work;
    return work;
  }
}
