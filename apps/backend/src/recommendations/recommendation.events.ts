import { Topology } from '../infrastructure/rabbitmq/rabbitmq.topology.js';

export const RECOMMENDATION_GENERATE = Topology.generateRecommendationKey;

export interface GenerateRecommendationPayload {
  recommendationId: string;
}

/**
 * Outbox row requesting (or re-requesting, after a backoff) the generation of a recommendation.
 */
export function generateRecommendationEvent(
  recommendationId: string,
  availableAt = new Date(),
) {
  const payload: GenerateRecommendationPayload = { recommendationId };

  return {
    eventType: RECOMMENDATION_GENERATE,
    aggregateType: 'Recommendation',
    aggregateId: recommendationId,
    payload: { ...payload },
    availableAt,
  };
}
