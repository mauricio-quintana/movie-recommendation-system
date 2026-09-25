import {
  InvalidModelOutputError,
  parseRecommendationOutput,
} from './recommendation-output.js';

describe('parseRecommendationOutput', () => {
  const candidates = [550, 603, 13];

  it('accepts a candidate with a reason', () => {
    expect(
      parseRecommendationOutput(
        '{"tmdbId": 603, "reason": "  Because you like sci-fi.  "}',
        candidates,
      ),
    ).toEqual({ tmdbId: 603, reason: 'Because you like sci-fi.' });
  });

  it('accepts a numeric string id', () => {
    expect(
      parseRecommendationOutput(
        '{"tmdbId": "13", "reason": "Fits."}',
        candidates,
      ).tmdbId,
    ).toBe(13);
  });

  it('rejects a movie outside the candidate set', () => {
    expect(() =>
      parseRecommendationOutput(
        '{"tmdbId": 999, "reason": "Great movie."}',
        candidates,
      ),
    ).toThrow('outside the candidate set');
  });

  it.each([
    ['not json', 'not valid JSON'],
    ['[603]', 'not a JSON object'],
    ['null', 'not a JSON object'],
    ['{"reason": "x"}', 'no valid tmdbId'],
    ['{"tmdbId": 603.5, "reason": "x"}', 'no valid tmdbId'],
    ['{"tmdbId": "603abc", "reason": "x"}', 'no valid tmdbId'],
    ['{"tmdbId": 603}', 'invalid reason'],
    ['{"tmdbId": 603, "reason": "   "}', 'invalid reason'],
    ['{"tmdbId": 603, "reason": 42}', 'invalid reason'],
  ])('rejects %s', (content, message) => {
    expect(() => parseRecommendationOutput(content, candidates)).toThrow(
      InvalidModelOutputError,
    );
    expect(() => parseRecommendationOutput(content, candidates)).toThrow(
      message,
    );
  });

  it('rejects an excessively long reason', () => {
    const reason = 'a'.repeat(1201);

    expect(() =>
      parseRecommendationOutput(
        JSON.stringify({ tmdbId: 550, reason }),
        candidates,
      ),
    ).toThrow('invalid reason');
  });
});
