export const HUMAN_REVIEW_ITEMS = [
  { id: 'B1', label: 'Accuracy and source fit', blocking: true, description: 'Sources support the framing, status, numbers, and implications.' },
  { id: 'B2', label: 'Columbus news value', blocking: true, description: 'The local consequence is specific, timely, and more than keyword decoration.' },
  { id: 'B3', label: 'Reader promise and usefulness', blocking: false, description: 'The headline makes one promise and the story fully delivers it.' },
  { id: 'B4', label: 'Clarity and scanability', blocking: false, description: 'A smart nonexpert can understand the story on the first reading.' },
  { id: 'B5', label: 'Educational entertainment', blocking: false, description: 'A truthful scene, tension, object, or comparison makes the facts memorable.' },
  { id: 'B6', label: 'Fairness and context', blocking: true, description: 'The story separates fact, proposal, and inference and includes material constraints.' },
  { id: 'B7', label: 'Original reporting value', blocking: true, description: 'CREN adds a record check, timeline, calculation, interview, or useful synthesis.' },
  { id: 'B8', label: 'SEO and answer-engine fit', blocking: false, description: 'The page satisfies one real search task and answers it immediately.' },
  { id: 'B9', label: 'Voice and restraint', blocking: false, description: 'The voice is calm, neighborly, specific, and free of boosterism.' },
] as const;

export type HumanReviewScores = Record<(typeof HUMAN_REVIEW_ITEMS)[number]['id'], number>;

export function validateHumanReview(value: unknown) {
  const scores = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const normalized = Object.fromEntries(HUMAN_REVIEW_ITEMS.map((item) => [item.id, Number(scores[item.id] ?? 0)]));
  const valuesValid = HUMAN_REVIEW_ITEMS.every((item) => [0, 1, 2].includes(normalized[item.id]));
  const blockingPassed = HUMAN_REVIEW_ITEMS.filter((item) => item.blocking)
    .every((item) => normalized[item.id] > 0);
  const total = Object.values(normalized).reduce((sum, score) => sum + score, 0);
  return { passed: valuesValid && blockingPassed && total >= 14, total, scores: normalized };
}
