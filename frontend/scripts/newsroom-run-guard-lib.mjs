export const RUN_MODES = Object.freeze({
  FULL_RUN: 'FULL_RUN',
  SECOND_RUN: 'SECOND_RUN',
  QUOTA_MET: 'QUOTA_MET',
});

export const STORY_SLOTS = Object.freeze(['real_estate', 'lifestyle']);
export const MAX_ARTICLES_PER_DAY = 2;

const LIFESTYLE_TOPIC_SLUGS = new Set(['events-lifestyle']);
const LIFESTYLE_CATEGORIES = new Set(['lifestyle', 'events & lifestyle', 'events-lifestyle', 'events']);

const MODE_INSTRUCTIONS = {
  FULL_RUN:
    'No receipt for today is on main. Run full discovery; at most one real-estate story and one lifestyle story.',
  SECOND_RUN:
    'A receipt for today is already on main. Fill only the open slot(s) listed; a story sharing the earlier ' +
    "article's canonical_event_key is not a second story. If a story ships, update today's receipt in place " +
    '(sorted article_paths, new completed_at, one `runs` entry per run). If nothing ships, commit nothing.',
  QUOTA_MET:
    'Two articles for today are already on main. Commit nothing, open no pull request, and report QUOTA_MET.',
};

export function easternDate(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('INVALID_GUARD_TIME');
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function classifyStorySlot(article) {
  const topic = String(article?.topic_slug ?? '').trim().toLowerCase();
  const category = String(article?.category ?? '').trim().toLowerCase();
  if (LIFESTYLE_TOPIC_SLUGS.has(topic) || LIFESTYLE_CATEGORIES.has(category)) return 'lifestyle';
  return 'real_estate';
}

export function assessSameDayRun({ date, receipt = null, articles = {} }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error('INVALID_GUARD_DATE');
  const notes = [];

  if (!receipt) {
    return {
      date,
      mode: RUN_MODES.FULL_RUN,
      receipt_present: false,
      story_result: null,
      article_paths: [],
      filled_slots: [],
      open_slots: [...STORY_SLOTS],
      notes,
      instructions: MODE_INSTRUCTIONS.FULL_RUN,
    };
  }

  if (receipt.date && receipt.date !== date) {
    notes.push(`Receipt date ${receipt.date} does not match the file date ${date}; the file name wins.`);
  }
  const articlePaths = Array.isArray(receipt.article_paths)
    ? [...new Set(receipt.article_paths.filter((p) => typeof p === 'string' && p.length > 0))].sort()
    : [];
  if (!Array.isArray(receipt.article_paths)) notes.push('Receipt article_paths is missing or not an array.');

  const filled = new Set();
  for (const path of articlePaths) {
    const article = articles[path];
    if (article && typeof article === 'object') {
      filled.add(classifyStorySlot(article));
    } else {
      filled.add('real_estate');
      notes.push(`Article ${path} could not be read; counted as the real-estate slot to avoid a duplicate.`);
    }
  }

  let mode;
  if (articlePaths.length >= MAX_ARTICLES_PER_DAY) {
    mode = RUN_MODES.QUOTA_MET;
    for (const slot of STORY_SLOTS) filled.add(slot);
  } else {
    mode = RUN_MODES.SECOND_RUN;
    if (articlePaths.length === 0) {
      notes.push(`Earlier run recorded ${receipt.story_result ?? 'an unknown result'} with no article; both slots are open.`);
    }
  }

  const filledSlots = STORY_SLOTS.filter((slot) => filled.has(slot));
  return {
    date,
    mode,
    receipt_present: true,
    story_result: receipt.story_result ?? null,
    article_paths: articlePaths,
    filled_slots: filledSlots,
    open_slots: STORY_SLOTS.filter((slot) => !filled.has(slot)),
    notes,
    instructions: MODE_INSTRUCTIONS[mode],
  };
}
