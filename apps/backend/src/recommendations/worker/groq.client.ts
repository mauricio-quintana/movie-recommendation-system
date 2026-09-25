import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const REQUEST_TIMEOUT_MS = 20_000;

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/**
 * Classified Groq failure. `retryable` follows the product rules: timeouts, network
 * errors, 429 and 5xx are transient; configuration, credentials and payload errors are not.
 */
export class GroqError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export function parseRetryAfter(
  header: string | null,
  now = Date.now(),
): number | undefined {
  if (!header) {
    return undefined;
  }

  const seconds = Number(header);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }

  const date = Date.parse(header);

  return Number.isNaN(date) ? undefined : Math.max(date - now, 0);
}

/**
 * Groq chat completions (OpenAI-compatible API). Only used by the recommendation worker.
 * No automatic retries here: the worker owns the retry/backoff policy.
 */
@Injectable()
export class GroqClient {
  private readonly logger = new Logger(GroqClient.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('GROQ_API_KEY');
    this.baseUrl = config.getOrThrow<string>('GROQ_BASE_URL');
    this.model = config.getOrThrow<string>('GROQ_MODEL');
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.3,
          // Reasoning models (gpt-oss) spend part of this budget before answering.
          max_completion_tokens: 1024,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const timeout = (error as Error).name === 'TimeoutError';

      throw new GroqError(
        timeout ? 'GROQ_TIMEOUT' : 'GROQ_NETWORK_ERROR',
        true,
        timeout ? 'Groq request timed out' : 'Groq could not be reached',
      );
    }

    if (!response.ok) {
      throw this.toError(response);
    }

    let body: { choices?: { message?: { content?: unknown } }[] };

    try {
      body = (await response.json()) as typeof body;
    } catch {
      throw new GroqError(
        'INVALID_MODEL_OUTPUT',
        false,
        'Groq returned a non-JSON response',
      );
    }

    const content = body.choices?.[0]?.message?.content;

    if (typeof content !== 'string') {
      throw new GroqError(
        'INVALID_MODEL_OUTPUT',
        false,
        'Groq returned no message content',
      );
    }

    return content;
  }

  private toError(response: Response): GroqError {
    const status = response.status;
    // Response bodies may echo request details: only the status is logged.
    this.logger.warn(`Groq responded with ${status}`);

    if (status === 429) {
      return new GroqError(
        'GROQ_RATE_LIMITED',
        true,
        'Groq rate limit reached',
        parseRetryAfter(response.headers.get('retry-after')),
      );
    }

    // 498: Groq flex tier capacity exceeded.
    if (status >= 500 || status === 498 || status === 408) {
      return new GroqError(
        'GROQ_UNAVAILABLE',
        true,
        'Groq is temporarily unavailable',
        parseRetryAfter(response.headers.get('retry-after')),
      );
    }

    if (status === 401 || status === 403) {
      return new GroqError(
        'GROQ_AUTH_FAILED',
        false,
        'Groq rejected the configured credentials',
      );
    }

    return new GroqError(
      'GROQ_REQUEST_REJECTED',
      false,
      `Groq rejected the request (${status})`,
    );
  }
}
