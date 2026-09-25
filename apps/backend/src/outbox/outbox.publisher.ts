import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { RabbitMqService } from '../infrastructure/rabbitmq/rabbitmq.service.js';
import { EXCHANGE_BY_EVENT_TYPE } from '../infrastructure/rabbitmq/rabbitmq.topology.js';

const POLL_INTERVAL_MS = 1_000;
const BATCH_SIZE = 20;
// A claimed event not marked as published within this window is picked up again.
const CLAIM_LEASE_SECONDS = 30;
const MAX_PUBLISH_BACKOFF_MS = 60_000;

interface ClaimedEvent {
  id: string;
  eventType: string;
  payload: unknown;
  attempts: number;
}

/**
 * Relays committed OutboxEvents to RabbitMQ. Events are claimed with a lease
 * (FOR UPDATE SKIP LOCKED) so several workers can run concurrently; a crash between
 * publish and mark-as-published only causes a duplicate, which consumers tolerate.
 */
@Injectable()
export class OutboxPublisher
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly rabbit: RabbitMqService,
  ) {}

  onApplicationBootstrap() {
    this.schedule(0);
  }

  async onApplicationShutdown() {
    this.stopped = true;

    if (this.timer) {
      clearTimeout(this.timer);
    }

    await this.running;
  }

  /**
   * Publishes every due event. Returns how many were published.
   */
  async publishPending(): Promise<number> {
    const events = await this.claim();
    let published = 0;

    for (const event of events) {
      if (await this.publish(event)) {
        published++;
      }
    }

    return published;
  }

  private schedule(delayMs: number) {
    if (this.stopped) {
      return;
    }

    this.timer = setTimeout(() => {
      this.running = this.publishPending()
        .then((published) =>
          published > 0
            ? this.logger.log(`Published ${published} event(s)`)
            : undefined,
        )
        .catch((error: Error) =>
          this.logger.error(`Outbox relay failed: ${error.message}`),
        )
        .finally(() => this.schedule(POLL_INTERVAL_MS));
    }, delayMs);
  }

  private claim(): Promise<ClaimedEvent[]> {
    // Timestamps are stored as UTC without time zone (Prisma convention).
    return this.prisma.$queryRaw<ClaimedEvent[]>`
      UPDATE "outbox_event"
      SET "availableAt" = (NOW() AT TIME ZONE 'UTC') + make_interval(secs => ${CLAIM_LEASE_SECONDS}),
          "attempts" = "attempts" + 1,
          "updatedAt" = (NOW() AT TIME ZONE 'UTC')
      WHERE "id" IN (
        SELECT "id" FROM "outbox_event"
        WHERE "publishedAt" IS NULL AND "availableAt" <= (NOW() AT TIME ZONE 'UTC')
        ORDER BY "availableAt"
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "eventType", "payload", "attempts"`;
  }

  private async publish(event: ClaimedEvent): Promise<boolean> {
    const exchange = EXCHANGE_BY_EVENT_TYPE[event.eventType];

    try {
      if (!exchange) {
        throw new Error(`No exchange configured for ${event.eventType}`);
      }

      await this.rabbit.publish(exchange, event.eventType, event.payload, {
        messageId: event.id,
        type: event.eventType,
      });

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { publishedAt: new Date(), lastError: null },
      });

      return true;
    } catch (error) {
      const message = (error as Error).message.slice(0, 500);
      this.logger.warn(
        `Could not publish outbox event ${event.id}: ${message}`,
      );

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          lastError: message,
          availableAt: new Date(
            Date.now() +
              Math.min(1_000 * 2 ** event.attempts, MAX_PUBLISH_BACKOFF_MS),
          ),
        },
      });

      return false;
    }
  }
}
