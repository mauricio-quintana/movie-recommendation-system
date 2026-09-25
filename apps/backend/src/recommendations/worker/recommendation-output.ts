import { MAX_REASON_LENGTH } from './recommendation-prompt.js';

export class InvalidModelOutputError extends Error {}

export interface RecommendationSelection {
  tmdbId: number;
  reason: string;
}

// Some tolerance over the prompt limit so a slightly verbose answer is not discarded.
const REASON_HARD_LIMIT = MAX_REASON_LENGTH * 2;

/**
 * Validates the model output before anything is persisted. The critical rule is
 * that the selected movie belongs to the candidate set.
 */
export function parseRecommendationOutput(
  content: string,
  candidateTmdbIds: readonly number[],
): RecommendationSelection {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new InvalidModelOutputError('Model output is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new InvalidModelOutputError('Model output is not a JSON object');
  }

  const { tmdbId: rawTmdbId, reason: rawReason } = parsed as Record<
    string,
    unknown
  >;

  const tmdbId =
    typeof rawTmdbId === 'string' && /^\d+$/.test(rawTmdbId.trim())
      ? Number(rawTmdbId.trim())
      : rawTmdbId;

  if (typeof tmdbId !== 'number' || !Number.isSafeInteger(tmdbId)) {
    throw new InvalidModelOutputError('Model output has no valid tmdbId');
  }

  if (!candidateTmdbIds.includes(tmdbId)) {
    throw new InvalidModelOutputError(
      'Model selected a movie outside the candidate set',
    );
  }

  const reason = typeof rawReason === 'string' ? rawReason.trim() : '';

  if (reason.length === 0 || reason.length > REASON_HARD_LIMIT) {
    throw new InvalidModelOutputError('Model output has an invalid reason');
  }

  return { tmdbId, reason };
}
