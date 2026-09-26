export const IMAGE_POLICY_VERSION = 'cren-image-v2-real-photo-first';
export const AI_IMAGE_CAPTION = 'AI-generated illustration; not a photograph of the actual property or event.';

const filled = value => typeof value === 'string' && value.trim().length > 0;
const webUrl = value => {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; }
  catch { return false; }
};

/** Recorded evidence is reviewable provenance, not automatic proof of ownership or authenticity.
 * No remote asset is fetched here. Sourced files are acquired and inspected by the image editor.
 */
export function planEditorialImage(article) {
  const brief = article?.image_brief ?? {};
  const provenance = article?.image_provenance ?? {};
  const sources = brief.source_review;
  const hold = reason => ({ mode: 'NEEDS_RESEARCH', reason });
  if (brief.image_policy_version !== IMAGE_POLICY_VERSION || brief.source_asset_considered !== true
    || !Array.isArray(sources) || sources.length < 1 || sources.length > 10
    || !sources.every(item => item && webUrl(item.url) && filled(item.note)
      && ['SELECTED', 'UNAVAILABLE', 'RIGHTS_UNCLEAR', 'UNSUITABLE'].includes(item.outcome))) {
    return hold('REAL_PHOTO_RESEARCH_REQUIRED');
  }
  if (provenance.type === 'AI_GENERATED') {
    if (sources.some(item => item.outcome === 'SELECTED')) return hold('USE_SELECTED_SOURCE_ASSET');
    if (!filled(brief.source_asset_note)) return hold('AI_FALLBACK_REASON_REQUIRED');
    if (provenance.caption !== AI_IMAGE_CAPTION
      || (article.image_caption != null && article.image_caption !== provenance.caption)) return hold('AI_DISCLOSURE_REQUIRED');
    if (!/^AI-generated illustration\b/i.test(article.image_alt ?? '')) return hold('AI_ALT_DISCLOSURE_REQUIRED');
    return { mode: 'AI_FALLBACK', reason: brief.source_asset_note };
  }
  if (!['LICENSED_PHOTO', 'OFFICIAL_RENDERING', 'PUBLIC_RECORD_GRAPHIC', 'CREN_GRAPHIC'].includes(provenance.type)) {
    return hold('IMAGE_PROVENANCE_TYPE_REQUIRED');
  }
  if (!sources.some(item => item.outcome === 'SELECTED' && item.url === provenance.source)
    || !webUrl(provenance.source) || !filled(provenance.license) || !filled(provenance.permission_evidence)
    || !filled(provenance.credit) || !filled(provenance.caption)
    || !filled(provenance.location_note) || !filled(provenance.date_note)
    || !filled(provenance.verified_by) || !filled(provenance.verified_at)
    || !Number.isFinite(Date.parse(provenance.verified_at))) return hold('SOURCE_RIGHTS_AND_CONTEXT_REQUIRED');
  if (!provenance.caption.includes(provenance.credit)
    || (article.image_caption != null && article.image_caption !== provenance.caption)) return hold('SOURCE_CAPTION_MISMATCH');
  if (provenance.type === 'OFFICIAL_RENDERING' && !/rendering/i.test(provenance.caption)) return hold('RENDERING_DISCLOSURE_REQUIRED');
  if (provenance.type === 'LICENSED_PHOTO' && /AI-generated|\brendering\b/i.test(provenance.caption)) return hold('PHOTO_PROVENANCE_CONFLICT');
  // Owner amendment, September 26, 2026: CREN data graphics and honest context photos may lead a story.
  if (provenance.type === 'CREN_GRAPHIC' && !(/\bCREN\b/.test(provenance.caption) && /\b(data|source)\b/i.test(provenance.caption))) {
    return hold('GRAPHIC_DATA_SOURCE_CAPTION_REQUIRED');
  }
  if (brief.image_role != null && !['SUBJECT', 'CONTEXT', 'DATA'].includes(brief.image_role)) return hold('IMAGE_ROLE_INVALID');
  if (brief.image_role === 'DATA' && !['CREN_GRAPHIC', 'PUBLIC_RECORD_GRAPHIC'].includes(provenance.type)) return hold('DATA_ROLE_REQUIRES_GRAPHIC');
  if (brief.image_role === 'CONTEXT') {
    if (provenance.type !== 'LICENSED_PHOTO') return hold('CONTEXT_ROLE_REQUIRES_PHOTO');
    // The caption must say when the photo was taken so it never passes as the story site today.
    if (!/\b(18|19|20)\d{2}\b/.test(provenance.caption)) return hold('CONTEXT_CAPTION_YEAR_REQUIRED');
  }
  return { mode: 'SOURCE_ASSET', reason: 'Use the verified source file; never synthesize a replacement.' };
}

/** Bind the operator's full-size inspection and source decision to these exact input bytes. */
export function validateImageAttachmentReview(review, articleId, sourceSha256) {
  if (!review || review.article_id !== articleId || review.source_sha256 !== sourceSha256) throw new Error('IMAGE_REVIEW_FILE_MISMATCH');
  const inspection = review.visual_review;
  const checks = ['natural_appearance', 'geometry_and_shadows', 'no_synthetic_artifacts', 'story_match', 'truthful_caption', 'mobile_crop'];
  if (!inspection || !filled(inspection.reviewed_by) || !Number.isFinite(Date.parse(inspection.reviewed_at))
    || !checks.every(key => inspection[key] === true)) throw new Error('FULL_SIZE_IMAGE_REVIEW_REQUIRED');
  if (!filled(review.image_alt) || review.image_alt.length < 40 || review.image_alt.length > 160) throw new Error('IMAGE_ALT_REQUIRED');
  const plan = planEditorialImage(review);
  if (plan.mode === 'NEEDS_RESEARCH') throw new Error(plan.reason);
  return plan;
}
