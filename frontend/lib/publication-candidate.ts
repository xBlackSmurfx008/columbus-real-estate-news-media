const SUBMISSION_FIELDS = [
  'title', 'category', 'excerpt', 'body', 'author', 'date', 'read_time', 'area_slug', 'topic_slug', 'tags',
  'image_url', 'meta_description', 'image_alt', 'fact_checked_at',
] as const;

/** Neon decodes timestamptz as Date; editorial artifacts must remain JSON data. */
export function normalizeFactCheckedAt(value: unknown): unknown {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  }
  return value;
}

export function mergePublicationCandidate(
  staged: Record<string, unknown>,
  edits: Record<string, unknown>,
) {
  const candidate = structuredClone(staged);
  for (const field of SUBMISSION_FIELDS) {
    if (Object.hasOwn(edits, field)) candidate[field] = edits[field];
  }
  if (Object.hasOwn(candidate, 'fact_checked_at')) candidate.fact_checked_at = normalizeFactCheckedAt(candidate.fact_checked_at);
  if (Object.hasOwn(edits, 'image_caption')) {
    const provenance = candidate.image_provenance && typeof candidate.image_provenance === 'object'
      ? candidate.image_provenance as Record<string, unknown>
      : {};
    candidate.image_provenance = { ...provenance, caption: edits.image_caption };
  }
  return candidate;
}
