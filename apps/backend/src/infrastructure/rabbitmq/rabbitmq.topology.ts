import type { Channel } from 'amqplib';

export const Topology = {
  commandsExchange: 'app.commands',
  eventsExchange: 'app.events',
  recommendationQueue: 'recommendation.commands',
  recommendationDlq: 'recommendation.commands.dlq',
  generateRecommendationKey: 'recommendation.generate',
} as const;

/**
 * Broker-side safety net for poison messages that crash the worker repeatedly:
 * after this many deliveries the quorum queue dead-letters the message.
 */
const DELIVERY_LIMIT = 10;

/**
 * Idempotent declaration of the topology described in docs/ARCHITECTURE.md.
 * Queues are durable quorum queues (RabbitMQ's recommended replicated queue type).
 */
export async function assertTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(Topology.commandsExchange, 'direct', {
    durable: true,
  });
  await channel.assertExchange(Topology.eventsExchange, 'topic', {
    durable: true,
  });

  await channel.assertQueue(Topology.recommendationDlq, {
    durable: true,
    arguments: { 'x-queue-type': 'quorum' },
  });

  await channel.assertQueue(Topology.recommendationQueue, {
    durable: true,
    arguments: {
      'x-queue-type': 'quorum',
      'x-delivery-limit': DELIVERY_LIMIT,
      // Rejected (requeue=false) messages go to the DLQ through the default exchange.
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': Topology.recommendationDlq,
    },
  });

  await channel.bindQueue(
    Topology.recommendationQueue,
    Topology.commandsExchange,
    Topology.generateRecommendationKey,
  );
}

/**
 * Exchange each outbox event type is published to.
 */
export const EXCHANGE_BY_EVENT_TYPE: Record<string, string> = {
  [Topology.generateRecommendationKey]: Topology.commandsExchange,
};
