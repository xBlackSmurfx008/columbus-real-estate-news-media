// Task cards live in directives/tasks/*.md. Each card is the complete prompt a
// spawned agent receives, plus front matter the dispatcher uses for routing.
// Front matter is deliberately flat (key: value, inline [a, b] lists) so it can
// be parsed without a YAML dependency and edited safely by any agent.

export const STATUSES = ['open', 'claimed', 'in_review', 'blocked', 'done', 'dropped'];
export const ASSIGNEES = ['cren-engineer', 'cren-docs', 'owner'];
export const PRIORITIES = ['P1', 'P2', 'P3'];
export const MERGE_POLICIES = ['owner', 'auto_after_green'];
export const REQUIRED_KEYS = ['id', 'directive', 'priority', 'status', 'assignee', 'created', 'due', 'attempts', 'merge_policy'];
export const REQUIRED_SECTIONS = ['Goal', 'Context', 'Scope', 'Definition of done', 'Verification', 'Stop and escalate if', 'Log'];
export const MAX_ATTEMPTS = 2;

const ID_PATTERN = /^\d{4}-\d{2}-\d{2}-p[1-3][a-z]?-[a-z0-9-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseValue(raw) {
  const value = raw.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(item => item.trim()).filter(Boolean);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

export function parseTaskCard(text, file = '<card>') {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  if (!match) return { file, meta: {}, body: text, sections: {}, title: '', parseError: 'MISSING_FRONT_MATTER' };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.replace(/\s+#.*$/, '').trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon < 1) continue;
    meta[trimmed.slice(0, colon).trim()] = parseValue(trimmed.slice(colon + 1));
  }
  const body = match[2];
  const title = (/^#\s+(.+)$/m.exec(body) || [])[1]?.trim() || '';
  const sections = {};
  let current = null;
  for (const line of body.split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = heading[1];
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  for (const key of Object.keys(sections)) sections[key] = sections[key].join('\n').trim();
  return { file, meta, body, sections, title };
}

export function checklist(sectionText = '') {
  const items = [];
  for (const line of sectionText.split('\n')) {
    const item = /^\s*-\s+\[( |x|X)\]\s+(.+)$/.exec(line);
    if (item) items.push({ done: item[1] !== ' ', text: item[2].trim() });
  }
  return items;
}

export function validateCard(card, knownIds = new Set()) {
  const errors = [];
  const { meta, sections } = card;
  if (card.parseError) return [card.parseError];
  for (const key of REQUIRED_KEYS) {
    if (meta[key] === undefined || meta[key] === '') errors.push(`MISSING_KEY:${key}`);
  }
  if (meta.id && !ID_PATTERN.test(meta.id)) errors.push('BAD_ID');
  if (meta.id && card.file !== '<card>' && !card.file.endsWith(`${meta.id}.md`)) errors.push('ID_FILENAME_MISMATCH');
  if (meta.status && !STATUSES.includes(meta.status)) errors.push(`BAD_STATUS:${meta.status}`);
  if (meta.assignee && !ASSIGNEES.includes(meta.assignee)) errors.push(`BAD_ASSIGNEE:${meta.assignee}`);
  if (meta.priority && !PRIORITIES.includes(meta.priority)) errors.push(`BAD_PRIORITY:${meta.priority}`);
  if (meta.merge_policy && !MERGE_POLICIES.includes(meta.merge_policy)) errors.push(`BAD_MERGE_POLICY:${meta.merge_policy}`);
  if (meta.merge_policy === 'auto_after_green' && meta.assignee !== 'cren-docs') errors.push('AUTO_MERGE_DOCS_ONLY');
  for (const key of ['created', 'due']) {
    if (meta[key] && !DATE_PATTERN.test(String(meta[key]))) errors.push(`BAD_DATE:${key}`);
  }
  if (meta.attempts !== undefined && !Number.isInteger(meta.attempts)) errors.push('BAD_ATTEMPTS');
  if (!card.title) errors.push('MISSING_TITLE');
  for (const name of REQUIRED_SECTIONS) {
    if (!sections[name]) errors.push(`MISSING_SECTION:${name}`);
  }
  const dod = checklist(sections['Definition of done']);
  if (sections['Definition of done'] !== undefined && dod.length === 0) errors.push('DOD_NOT_CHECKLIST');
  const blockedBy = Array.isArray(meta.blocked_by) ? meta.blocked_by : [];
  if (meta.blocked_by !== undefined && !Array.isArray(meta.blocked_by)) errors.push('BLOCKED_BY_NOT_LIST');
  for (const dep of blockedBy) {
    if (knownIds.size && !knownIds.has(dep)) errors.push(`UNKNOWN_DEPENDENCY:${dep}`);
    if (dep === meta.id) errors.push('SELF_DEPENDENCY');
  }
  if (meta.status === 'in_review' && !meta.pr) errors.push('IN_REVIEW_WITHOUT_PR');
  if (meta.status === 'blocked' && !blockedBy.length && !meta.blocked_reason) errors.push('BLOCKED_WITHOUT_REASON');
  if (meta.status === 'done' && dod.some(item => !item.done)) errors.push('DONE_WITH_UNCHECKED_DOD');
  if (meta.status === 'done' && !meta.verified_by) errors.push('DONE_WITHOUT_VERIFIER');
  if (meta.status === 'dropped' && !meta.dropped_reason) errors.push('DROPPED_WITHOUT_REASON');
  return errors;
}

function daysBetween(from, to) {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function buildBoard(cards, today) {
  const byId = new Map(cards.map(card => [card.meta.id, card]));
  const knownIds = new Set(byId.keys());
  const rows = cards.map(card => {
    const deps = Array.isArray(card.meta.blocked_by) ? card.meta.blocked_by : [];
    const unmetDeps = deps.filter(dep => byId.get(dep)?.meta.status !== 'done');
    const dod = checklist(card.sections['Definition of done']);
    return {
      id: card.meta.id,
      title: card.title,
      priority: card.meta.priority,
      status: card.meta.status,
      assignee: card.meta.assignee,
      due: card.meta.due,
      ageDays: card.meta.created ? daysBetween(card.meta.created, today) : null,
      overdue: Boolean(card.meta.due) && daysBetween(card.meta.due, today) > 0 && !['done', 'dropped'].includes(card.meta.status),
      unmetDeps,
      attempts: card.meta.attempts ?? 0,
      pr: card.meta.pr || '',
      dodDone: dod.filter(item => item.done).length,
      dodTotal: dod.length,
      errors: validateCard(card, knownIds),
      file: card.file,
    };
  });
  const sorted = rows.slice().sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || String(a.id).localeCompare(String(b.id)));
  const agentReady = sorted.filter(row => row.status === 'open' && row.assignee !== 'owner' && row.unmetDeps.length === 0
    && row.attempts < MAX_ATTEMPTS && row.errors.length === 0);
  const waiting = sorted.filter(row => row.status === 'open' && row.assignee !== 'owner' && row.unmetDeps.length > 0);
  const ownerQueue = sorted.filter(row => row.assignee === 'owner' && ['open', 'claimed', 'blocked'].includes(row.status));
  const inReview = sorted.filter(row => row.status === 'in_review');
  const stuck = sorted.filter(row => row.status !== 'done' && row.status !== 'dropped'
    && (row.attempts >= MAX_ATTEMPTS || row.status === 'blocked'));
  const closed = sorted.filter(row => ['done', 'dropped'].includes(row.status));
  return { rows: sorted, agentReady, waiting, ownerQueue, inReview, stuck, closed, invalid: sorted.filter(row => row.errors.length) };
}

export function renderBoard(board, today) {
  const line = row => `- [${row.priority}] ${row.id} — ${row.title} (${row.assignee}, ${row.status}, DoD ${row.dodDone}/${row.dodTotal}`
    + `${row.ageDays !== null ? `, age ${row.ageDays}d` : ''}${row.overdue ? ', OVERDUE' : ''}`
    + `${row.unmetDeps.length ? `, waits on ${row.unmetDeps.join(' + ')}` : ''}${row.pr ? `, ${row.pr}` : ''})`;
  const section = (heading, rows, empty) => [`### ${heading} (${rows.length})`, '', ...(rows.length ? rows.map(line) : [`- ${empty}`]), ''];
  const total = board.rows.length;
  const done = board.rows.filter(row => row.status === 'done').length;
  return [
    `## Task board — ${today}`,
    '',
    `${total} card(s): ${done} done, ${board.inReview.length} in review, ${board.agentReady.length} ready for agents, `
      + `${board.waiting.length} waiting on another card, ${board.ownerQueue.length} waiting on the owner, ${board.invalid.length} invalid.`,
    '',
    ...section('Ready for agents', board.agentReady, 'none'),
    ...section('Waiting on another card', board.waiting, 'none'),
    ...section('In review (PR open)', board.inReview, 'none'),
    ...section('Owner queue (only the owner can do these)', board.ownerQueue, 'none'),
    ...section('Stuck (blocked or out of attempts)', board.stuck.filter(row => row.assignee !== 'owner'), 'none'),
    ...section('Closed', board.closed, 'none'),
    ...(board.invalid.length
      ? ['### Invalid cards', '', ...board.invalid.map(row => `- ${row.file}: ${row.errors.join(', ')}`), '']
      : []),
  ].join('\n');
}
