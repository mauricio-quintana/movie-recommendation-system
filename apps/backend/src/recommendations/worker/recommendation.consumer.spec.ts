import type { Channel, ConsumeMessage } from 'amqplib';
import type { RabbitMqService } from '../../infrastructure/rabbitmq/rabbitmq.service.js';
import {
  parseGenerateMessage,
  RecommendationConsumer,
} from './recommendation.consumer.js';
import type { RecommendationProcessor } from './recommendation.processor.js';

const ID = '5b0f6a7e-7a39-4f4e-9a55-1f9b5a3b2c11';

function message(content: string): ConsumeMessage {
  return {
    content: Buffer.from(content),
    fields: {},
    properties: {},
  } as unknown as ConsumeMessage;
}

describe('RecommendationConsumer', () => {
  let channel: {
    ack: ReturnType<typeof vi.fn>;
    nack: ReturnType<typeof vi.fn>;
  };
  let processor: { process: ReturnType<typeof vi.fn> };
  let consumer: RecommendationConsumer;

  beforeEach(() => {
    vi.useFakeTimers();
    channel = { ack: vi.fn(), nack: vi.fn() };
    processor = { process: vi.fn() };
    consumer = new RecommendationConsumer(
      {} as RabbitMqService,
      processor as unknown as RecommendationProcessor,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('acks after successful processing', async () => {
    processor.process.mockResolvedValue('ack');

    await consumer.handle(
      message(JSON.stringify({ recommendationId: ID })),
      channel as unknown as Channel,
    );

    expect(processor.process).toHaveBeenCalledWith(ID);
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('dead-letters when the processor says so', async () => {
    processor.process.mockResolvedValue('dead-letter');
    const msg = message(JSON.stringify({ recommendationId: ID }));

    await consumer.handle(msg, channel as unknown as Channel);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
  });

  it.each([
    'not json',
    '{}',
    '{"recommendationId": "123"}',
    '{"recommendationId": 5}',
  ])(
    'dead-letters unprocessable payload %s without processing it',
    async (content) => {
      const msg = message(content);

      await consumer.handle(msg, channel as unknown as Channel);

      expect(processor.process).not.toHaveBeenCalled();
      expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    },
  );

  it('requeues after a pause on unexpected errors', async () => {
    processor.process.mockRejectedValue(new Error('database down'));
    const msg = message(JSON.stringify({ recommendationId: ID }));

    const handling = consumer.handle(msg, channel as unknown as Channel);
    await vi.runAllTimersAsync();
    await handling;

    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
  });
});

describe('parseGenerateMessage', () => {
  it('extracts the recommendation id', () => {
    expect(
      parseGenerateMessage(
        Buffer.from(JSON.stringify({ recommendationId: ID })),
      ),
    ).toEqual({
      recommendationId: ID,
    });
  });
});
