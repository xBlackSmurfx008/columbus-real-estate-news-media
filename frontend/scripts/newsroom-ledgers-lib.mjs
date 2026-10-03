export const WATCHLIST_SCHEMA = 'cren-watchlist-v1';
export const PHOTO_REQUESTS_SCHEMA = 'cren-photo-requests-v1';
export const WATCHLIST_STATUSES = Object.freeze(['PENDING', 'CLEARED', 'DROPPED']);
export const PHOTO_REQUEST_STATUSES = Object.freeze(['OPEN', 'SHOT', 'DROPPED']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARTICLE_PATH = /^frontend\/content\/articles\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/;

const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isIsoDate = (value) => typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
const isNullOrText = (value) => value === null || isText(value);
const isNullOrIsoDate = (value) => value === null || isIsoDate(value);

function checkEnvelope(doc, schema, errors) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    errors.push('document must be a JSON object');
    return false;
  }
  if (doc.schema_version !== schema) errors.push(`schema_version must be "${schema}"`);
  if (!isIsoDate(doc.updated_at)) errors.push('updated_at must be a YYYY-MM-DD date');
  if (!Array.isArray(doc.items)) {
    errors.push('items must be an array');
    return false;
  }
  return true;
}

function checkIds(items, errors) {
  const seen = new Set();
  items.forEach((item, index) => {
    const label = `items[${index}]`;
    if (!item || typeof item !== 'object') {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!isText(item.id) || !SLUG.test(item.id)) errors.push(`${label}.id must be a lowercase slug`);
    else if (seen.has(item.id)) errors.push(`${label}.id "${item.id}" is duplicated`);
    else seen.add(item.id);
  });
}

export function validateWatchlist(doc) {
  const errors = [];
  if (!checkEnvelope(doc, WATCHLIST_SCHEMA, errors)) return { ok: false, errors };
  checkIds(doc.items, errors);
  doc.items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const label = `items[${index}]${item.id ? ` (${item.id})` : ''}`;
    if (!isText(item.lead)) errors.push(`${label}.lead is required`);
    if (!isText(item.location)) errors.push(`${label}.location is required`);
    if (!isText(item.primary_record)) errors.push(`${label}.primary_record must name the record to check`);
    if (!isNullOrText(item.primary_record_url)) errors.push(`${label}.primary_record_url must be a string or null`);
    if (!isText(item.next_checkpoint)) errors.push(`${label}.next_checkpoint is required`);
    if (!WATCHLIST_STATUSES.includes(item.status)) errors.push(`${label}.status must be one of ${WATCHLIST_STATUSES.join(', ')}`);
    if (!isIsoDate(item.first_seen)) errors.push(`${label}.first_seen must be a YYYY-MM-DD date`);
    if (!isNullOrIsoDate(item.last_checked)) errors.push(`${label}.last_checked must be a YYYY-MM-DD date or null`);
    if (!isNullOrText(item.last_result)) errors.push(`${label}.last_result must be a string or null`);
    if (item.status === 'PENDING' && !isIsoDate(item.next_check)) errors.push(`${label}.next_check is required while PENDING`);
    if (item.status !== 'PENDING' && !isNullOrIsoDate(item.next_check)) errors.push(`${label}.next_check must be a date or null`);
    if (item.status === 'CLEARED' && !(isText(item.published_as) && ARTICLE_PATH.test(item.published_as))) {
      errors.push(`${label}.published_as must be the article path once CLEARED`);
    }
    if (item.status !== 'CLEARED' && item.published_as !== null && item.published_as !== undefined) {
      errors.push(`${label}.published_as must be null unless CLEARED`);
    }
    if (item.status === 'DROPPED' && !isText(item.last_result)) errors.push(`${label}.last_result must say why it was DROPPED`);
    if (item.notes !== undefined && !isNullOrText(item.notes)) errors.push(`${label}.notes must be a string or null`);
  });
  return { ok: errors.length === 0, errors };
}

export function dueWatchlistItems(doc, date) {
  if (!isIsoDate(date)) throw new Error('INVALID_LEDGER_DATE');
  return (doc?.items ?? [])
    .filter((item) => item?.status === 'PENDING' && isIsoDate(item.next_check) && item.next_check <= date)
    .sort((a, b) => a.next_check.localeCompare(b.next_check) || a.id.localeCompare(b.id));
}

export function validatePhotoRequests(doc) {
  const errors = [];
  if (!checkEnvelope(doc, PHOTO_REQUESTS_SCHEMA, errors)) return { ok: false, errors };
  checkIds(doc.items, errors);
  const addresses = new Set();
  doc.items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const label = `items[${index}]${item.id ? ` (${item.id})` : ''}`;
    if (!isText(item.address)) errors.push(`${label}.address is required`);
    else {
      const key = item.address.trim().toLowerCase();
      if (addresses.has(key)) errors.push(`${label}.address duplicates another entry; update the existing one instead`);
      addresses.add(key);
    }
    if (!isText(item.area)) errors.push(`${label}.area is required`);
    if (!isText(item.why)) errors.push(`${label}.why is required`);
    if (typeof item.time_sensitive !== 'boolean') errors.push(`${label}.time_sensitive must be true or false`);
    if (item.frames !== undefined && !isNullOrText(item.frames)) errors.push(`${label}.frames must be a string or null`);
    if (!isIsoDate(item.requested_on)) errors.push(`${label}.requested_on must be a YYYY-MM-DD date`);
    if (!isText(item.requested_by)) errors.push(`${label}.requested_by is required`);
    if (!PHOTO_REQUEST_STATUSES.includes(item.status)) errors.push(`${label}.status must be one of ${PHOTO_REQUEST_STATUSES.join(', ')}`);
    if (item.status === 'SHOT') {
      if (!isIsoDate(item.shot_on)) errors.push(`${label}.shot_on is required once SHOT`);
      if (!isText(item.library_ref)) errors.push(`${label}.library_ref must name the Drive files or run notes once SHOT`);
    } else {
      if (!isNullOrIsoDate(item.shot_on)) errors.push(`${label}.shot_on must be null unless SHOT`);
      if (!isNullOrText(item.library_ref)) errors.push(`${label}.library_ref must be a string or null`);
    }
    if (!Array.isArray(item.used_in) || !item.used_in.every((path) => isText(path) && ARTICLE_PATH.test(path))) {
      errors.push(`${label}.used_in must be an array of article paths`);
    }
    if (item.notes !== undefined && !isNullOrText(item.notes)) errors.push(`${label}.notes must be a string or null`);
  });
  return { ok: errors.length === 0, errors };
}

const byUrgency = (a, b) =>
  Number(Boolean(b.time_sensitive)) - Number(Boolean(a.time_sensitive)) ||
  a.requested_on.localeCompare(b.requested_on) ||
  a.id.localeCompare(b.id);

export function openPhotoRequests(doc) {
  return (doc?.items ?? []).filter((item) => item?.status === 'OPEN').sort(byUrgency);
}

export function shotPhotoRequests(doc) {
  return (doc?.items ?? [])
    .filter((item) => item?.status === 'SHOT')
    .sort((a, b) => b.shot_on.localeCompare(a.shot_on) || a.id.localeCompare(b.id));
}
