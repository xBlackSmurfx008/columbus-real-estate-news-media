const REQUIRED_FIELDS = [
  'prompt_version',
  'title',
  'category',
  'author',
  'date',
  'excerpt',
  'body',
  'answer_summary',
  'primary_keyword',
  'meta_description',
  'fact_checked_at',
  'source_ledger',
  'claim_ledger',
  'entity_ledger',
  'location',
  'canonical_event_key',
  'tags',
  'image_brief',
  'image_alt',
  'image_provenance',
];

const HYPE_PATTERNS = [
  /guaranteed return/i,
  /risk[- ]free/i,
  /can['’]?t miss/i,
  /secret investment/i,
  /get rich/i,
  /skyrocket/i,
  /crush the market/i,
  /wealth hack/i,
  /act now/i,
  /once-in-a-lifetime/i,
  /everyone is buying/i,
  /sure thing/i,
];

const PROMOTIONAL_PATTERNS = [
  /our team tracks/i,
  /start at \[?deploy capital/i,
  /book (?:a|your) (?:call|consultation)/i,
  /contact us to (?:invest|buy|sell)/i,
  /if you['’]?re weighing (?:a|an) (?:deal|investment)/i,
  /\blist your home\b/i,
  /\bsubscribe (?:to|for)\b/i,
  /\bfree (?:weekly )?brief\b/i,
  /\btalk (?:to|with) our team\b/i,
];

const THROAT_CLEARING_PATTERNS = [
  /in today['’]?s rapidly changing/i,
  /when it comes to/i,
  /it is important to note/i,
  /here['’]?s what it means/i,
];

function wordCount(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function plainText(value) {
  return String(value ?? '')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/[*_`#>~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeClaim(value) {
  return plainText(value).toLowerCase().replace(/[^a-z0-9%$]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function sentences(body) {
  return String(body ?? '')
    .replace(/^#{1,6}\s+.+$/gm, '')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sourceDomains(sources) {
  const domains = new Set();
  for (const source of sources) {
    try {
      domains.add(new URL(source.url).hostname.replace(/^www\./, ''));
    } catch {
      // URL validity is reported by its own check.
    }
  }
  return domains;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function markdownLinkUrls(body) {
  return [...String(body ?? '').matchAll(/\[[^\]]+\]\((https:\/\/[^)\s]+)\)/g)]
    .map((match) => normalizeUrl(match[1]))
    .filter(Boolean);
}

function check(id, passed, message, details = undefined) {
  return { id, passed: Boolean(passed), message, ...(details ? { details } : {}) };
}

/** Run the deterministic half of CREN's publication gate. Human judgment is always still required. */
export function evaluateArticle(article) {
  const body = String(article.body ?? '');
  const answer = String(article.answer_summary ?? '');
  const sources = Array.isArray(article.source_ledger) ? article.source_ledger : [];
  const claims = Array.isArray(article.claim_ledger) ? article.claim_ledger : [];
  const entities = Array.isArray(article.entity_ledger) ? article.entity_ledger : [];
  const sourceIds = new Set(sources.map((source) => source.id).filter(Boolean));
  const normalizedBody = normalizeClaim(body);
  const h2s = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  const paragraphs = body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const claimSentences = claims.map((claim) => normalizeClaim(claim.claim));
  const materialSentences = sentences(body).filter((sentence) => /(?:\$|%|\b\d[\d,.]*\b)/.test(plainText(sentence)));
  const statusSentences = sentences(body).filter((sentence) =>
    /\b(proposed|filed|recommended|approved|under construction|completed|sold)\b/i.test(sentence));
  const validSourceRecords = sources.every((source) => {
    try {
      const url = new URL(source.url);
      return Boolean(source.id && source.publisher && source.title && source.fetched_at
        && /^https:$/.test(url.protocol) && Number(source.http_status) >= 200 && Number(source.http_status) < 400);
    } catch {
      return false;
    }
  });
  const allClaimSourcesExist = claims.every((claim) =>
    claim.id && claim.claim && Array.isArray(claim.source_ids) && claim.source_ids.length > 0
      && claim.source_ids.every((id) => sourceIds.has(id)) && normalizedBody.includes(normalizeClaim(claim.claim)));
  const allEntitySourcesExist = entities.every((entity) =>
    entity.name && Array.isArray(entity.source_ids) && entity.source_ids.length > 0
      && entity.source_ids.every((id) => sourceIds.has(id)));
  const allMaterialClaimsMapped = materialSentences.every((sentence) => {
    const normalized = normalizeClaim(sentence);
    return claimSentences.some((claim) => claim.includes(normalized) || normalized.includes(claim));
  });
  const allStatusClaimsMapped = statusSentences.every((sentence) => {
    const normalized = normalizeClaim(sentence);
    return claimSentences.some((claim) => claim.includes(normalized) || normalized.includes(claim));
  });
  const unmappedMaterialClaims = materialSentences.filter((sentence) => {
    const normalized = normalizeClaim(sentence);
    return !claimSentences.some((claim) => claim.includes(normalized) || normalized.includes(claim));
  });
  const unmappedStatusClaims = statusSentences.filter((sentence) => {
    const normalized = normalizeClaim(sentence);
    return !claimSentences.some((claim) => claim.includes(normalized) || normalized.includes(claim));
  });
  const locationName = String(article.location?.name ?? '');
  const localOpening = `${article.title ?? ''} ${article.excerpt ?? ''} ${plainText(body).split(/\s+/).slice(0, 100).join(' ')}`;
  const localMatch = /\b(?:Columbus|Franklin County|Central Ohio)\b/i.test(localOpening)
    || (locationName && localOpening.toLowerCase().includes(locationName.toLowerCase()));
  const answerWords = wordCount(answer);
  const answerSentences = sentences(answer).length;
  const firstParagraph = plainText(paragraphs[0] ?? '');
  const titleLength = String(article.title ?? '').length;
  const metaLength = String(article.meta_description ?? '').length;
  const keyword = String(article.primary_keyword ?? '').trim().toLowerCase();
  const bodyWords = wordCount(plainText(body));
  const bodyLinks = new Set(markdownLinkUrls(body));
  const visiblyCitedSources = sources.filter((source) => bodyLinks.has(normalizeUrl(source.url)));
  const visibleSourceDomains = sourceDomains(visiblyCitedSources);
  const hasRawCitationTokens = /\[(?:(?=[^\]]*\d)[a-z0-9_-]{1,20}|calc)\](?!\()/i.test(body);
  const keywordUses = keyword ? normalizedBody.split(normalizeClaim(keyword)).length - 1 : 0;
  const keywordDensity = bodyWords ? (keywordUses * wordCount(keyword)) / bodyWords : 0;
  const imageAi = article.image_provenance?.type === 'AI_GENERATED';
  const imageCaption = String(article.image_provenance?.caption ?? '');
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const tagsAreValid = tags.length >= 3 && tags.length <= 7
    && new Set(tags).size === tags.length
    && tags.every((tag) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag));
  const contextTagsPresent = tags.includes('columbus-ohio')
    && tags.includes('central-ohio-real-estate')
    && (!article.topic_slug || tags.includes(article.topic_slug))
    && (!article.area_slug || article.area_slug === 'columbus-citywide' || tags.includes(article.area_slug));
  const categoryTagsPresent = (article.category !== 'Development' || tags.includes('development'))
    && (article.category !== 'Neighborhoods'
      || (tags.includes('neighborhood') && article.area_slug && article.area_slug !== 'columbus-citywide'));

  const checks = [
    check('A0_PROMPT_VERSION', article.prompt_version === 'cren-article-v1.0.0',
      'Use the current versioned CREN article-writing system.'),
    check('A1_REQUIRED_FIELDS', REQUIRED_FIELDS.every((field) => {
      const value = article[field];
      return Array.isArray(value) ? value.length > 0 : value && (typeof value !== 'object' || Object.keys(value).length > 0);
    }), 'All editorial metadata and ledgers are present.'),
    check('A2_LOCAL_SCOPE', article.location?.state === 'OH' && localMatch,
      'The title, dek, or opening must establish an exact Ohio/Columbus-area connection.'),
    check('A2B_TAGS_AND_HUBS', tagsAreValid && contextTagsPresent && categoryTagsPresent,
      'Use 3–7 unique kebab-case tags, including Columbus, topic, area, and required Development/Neighborhood context.'),
    check('A3_ANSWER_FIRST', answerWords >= 30 && answerWords <= 60 && answerSentences <= 2
      && !THROAT_CLEARING_PATTERNS.some((pattern) => pattern.test(answer)) && firstParagraph.includes(plainText(answer)),
    'A 30–60 word, two-sentence maximum answer summary must be the first paragraph.'),
    check('A4_SOURCE_FLOOR', sources.length >= 2 && sourceDomains(sources).size >= 2
      && sources.some((source) => source.type === 'PRIMARY') && validSourceRecords,
    'Use two independent fetched sources, including one primary record or direct source.'),
    check('A4B_READER_VISIBLE_SOURCES', visiblyCitedSources.length >= 2 && visibleSourceDomains.size >= 2,
      'Link at least two independent source-ledger records in the article body so readers can inspect the evidence.'),
    check('A5_CLAIM_TRACEABILITY', claims.length > 0 && allClaimSourcesExist,
      'Every claim-ledger entry must occur in the body and map to valid source IDs.'),
    check('A6_NUMBER_TRACEABILITY', materialSentences.length === 0 || allMaterialClaimsMapped,
      'Every material sentence containing a number, date, amount, or percentage must be in the claim ledger.',
      unmappedMaterialClaims.length ? { unmapped: unmappedMaterialClaims } : undefined),
    check('A7_ENTITY_VERIFICATION', entities.length > 0 && allEntitySourcesExist,
      'Named entities must be recorded with valid source IDs.'),
    check('A8_QUOTE_INTEGRITY', !/[“"][^”"]+[”"]/.test(body)
      || claims.some((claim) => claim.kind === 'QUOTE' && claim.exact_support && wordCount(claim.exact_support) <= 25),
    'Direct quotations require an exact, source-mapped excerpt of no more than 25 words.',
    /[“"][^”"]+[”"]/.test(body) ? { quoted_text_detected: true } : undefined),
    check('A9_TIME_AND_STATUS_LABELS', statusSentences.length === 0 || allStatusClaimsMapped,
      'Proposal, filing, approval, construction, completion, and sale statuses must be dated claims.',
      unmappedStatusClaims.length ? { unmapped: unmappedStatusClaims } : undefined),
    check('A10_HYPE_AND_PRESSURE_BLOCKLIST', !HYPE_PATTERNS.some((pattern) => pattern.test(`${article.title} ${article.excerpt} ${body}`)),
      'Promissory, pressure, and unsupported superlative language is prohibited.'),
    check('A11_FAIR_BALANCE', !PROMOTIONAL_PATTERNS.some((pattern) => pattern.test(body))
      && !/what this means for .*\b(?:buyers|sellers|investors|operators)\b/i.test(body),
    'CREN reporting cannot contain promotional CTAs or unsupported transaction/investment advice.'),
    check('A12_PUBLICATION_READY_COPY', bodyWords >= 350 && !hasRawCitationTokens,
      'Publishable articles need at least 350 words of supported reporting and cannot expose raw citation tokens.'),
    check('A13_SEO_METADATA', titleLength >= 45 && titleLength <= 75 && metaLength >= 140 && metaLength <= 165
      && keyword && keywordDensity <= 0.008
      && `${article.title} ${article.excerpt} ${plainText(body).split(/\s+/).slice(0, 120).join(' ')}`.toLowerCase().includes(keyword),
    'Title, meta description, and primary keyword must meet the restrained SEO limits.', {
      title_length: titleLength,
      meta_length: metaLength,
      keyword,
      keyword_density: Number(keywordDensity.toFixed(4)),
      keyword_in_opening: Boolean(keyword
        && `${article.title} ${article.excerpt} ${plainText(body).split(/\s+/).slice(0, 120).join(' ')}`.toLowerCase().includes(keyword)),
    }),
    check('A14_WEB_STRUCTURE', !/<\/?[a-z][^>]*>/i.test(body) && h2s.length >= 3 && h2s.length <= 7
      && !h2s.some((heading) => /^(introduction|background|conclusion|more information)$/i.test(heading))
      && paragraphs.every((paragraph) => paragraph.startsWith('## ') || wordCount(plainText(paragraph)) <= 120),
    'Use Markdown, 3–7 descriptive H2s, and paragraphs no longer than 120 words.'),
    check('A15_ORIGINALITY_AND_DISCLOSURE', Boolean(article.image_brief?.editorial_idea)
      && Array.isArray(article.image_brief?.story_anchors) && article.image_brief.story_anchors.length >= 2
      && article.image_brief?.source_asset_considered === true
      && Boolean(article.image_provenance?.type) && Boolean(imageCaption)
      && (!imageAi || /AI-generated (?:editorial )?(?:illustration|visualization|image)/i.test(imageCaption)),
    'The brief needs an editorial idea, two story anchors, source-asset consideration, and truthful AI disclosure.'),
  ];

  const failed = checks.filter((item) => !item.passed);
  return {
    passed: failed.length === 0,
    score: checks.length - failed.length,
    possible: checks.length,
    checks,
    failedCodes: failed.map((item) => item.id),
    humanReviewRequired: true,
  };
}

export function formatQualityReport(report) {
  return report.checks
    .map((item) => `${item.passed ? 'PASS' : 'FAIL'} ${item.id}: ${item.message}${item.details ? ` ${JSON.stringify(item.details)}` : ''}`)
    .join('\n');
}
