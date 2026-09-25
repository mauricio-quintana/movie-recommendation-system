import { ConfigService } from '@nestjs/config';
import { GroqClient, GroqError, parseRetryAfter } from './groq.client.js';

describe('GroqClient', () => {
  const config = new ConfigService({
    GROQ_API_KEY: 'gsk_test',
    GROQ_BASE_URL: 'https://groq.test/v1',
    GROQ_MODEL: 'test-model',
  });
  let client: GroqClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new GroqClient(config);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const messages = [{ role: 'user' as const, content: 'hi' }];

  async function failure(): Promise<GroqError> {
    try {
      await client.complete(messages);
    } catch (error) {
      return error as GroqError;
    }

    throw new Error('expected a failure');
  }

  it('sends a JSON-mode chat completion and returns the content', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        choices: [{ message: { content: '{"tmdbId":1,"reason":"x"}' } }],
      }),
    );

    await expect(client.complete(messages)).resolves.toBe(
      '{"tmdbId":1,"reason":"x"}',
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://groq.test/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer gsk_test');
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'test-model',
      messages,
      response_format: { type: 'json_object' },
    });
  });

  it('classifies 429 as retryable and honours Retry-After', async () => {
    fetchMock.mockResolvedValue(
      new Response('{}', { status: 429, headers: { 'retry-after': '7' } }),
    );

    expect(await failure()).toMatchObject({
      code: 'GROQ_RATE_LIMITED',
      retryable: true,
      retryAfterMs: 7000,
    });
  });

  it.each([500, 502, 503, 498])(
    'classifies %s as retryable',
    async (status) => {
      fetchMock.mockResolvedValue(new Response('{}', { status }));

      expect(await failure()).toMatchObject({
        code: 'GROQ_UNAVAILABLE',
        retryable: true,
      });
    },
  );

  it.each([
    [401, 'GROQ_AUTH_FAILED'],
    [403, 'GROQ_AUTH_FAILED'],
    [400, 'GROQ_REQUEST_REJECTED'],
    [404, 'GROQ_REQUEST_REJECTED'],
    [422, 'GROQ_REQUEST_REJECTED'],
  ])('classifies %s as non-retryable %s', async (status, code) => {
    fetchMock.mockResolvedValue(
      new Response('{"error":{"message":"secret details"}}', { status }),
    );

    const error = await failure();
    expect(error).toMatchObject({ code, retryable: false });
    expect(error.message).not.toContain('secret details');
  });

  it('classifies timeouts and network errors as retryable', async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
    );
    expect(await failure()).toMatchObject({
      code: 'GROQ_TIMEOUT',
      retryable: true,
    });

    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect(await failure()).toMatchObject({
      code: 'GROQ_NETWORK_ERROR',
      retryable: true,
    });
  });

  it('rejects responses without content', async () => {
    fetchMock.mockResolvedValue(Response.json({ choices: [] }));

    expect(await failure()).toMatchObject({
      code: 'INVALID_MODEL_OUTPUT',
      retryable: false,
    });
  });
});

describe('parseRetryAfter', () => {
  it('parses seconds and HTTP dates', () => {
    expect(parseRetryAfter('2.5')).toBe(2500);
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4_000)).toBe(6_000);
    expect(parseRetryAfter('soon')).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});
