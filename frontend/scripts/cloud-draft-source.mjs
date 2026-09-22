import { createHash } from 'node:crypto';

const API = 'https://api.github.com/repos/xBlackSmurfx008/columbus-real-estate-news-media';
const DIRECTORY = 'frontend/content/articles';
const MAX_ARTICLE_BYTES = 256 * 1024;
const SHA = /^[a-f0-9]{40}$/;

export function easternDate(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('CLOUD_DRAFT_INVALID_DATE');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

async function readJson(url, fetcher, maxBytes) {
  const timeout = AbortSignal.timeout(15_000);
  try {
    const response = await fetcher(url, {
      headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
      redirect: 'error', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: timeout,
    });
    if (response.redirected || (response.url && response.url !== url) || (response.status >= 300 && response.status < 400)) {
      throw new Error('CLOUD_DRAFT_UNEXPECTED_REDIRECT');
    }
    if (response.status === 429 || (response.status === 403
      && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')))) {
      throw new Error('CLOUD_DRAFT_RATE_LIMITED');
    }
    if (!response.ok) throw new Error(`CLOUD_DRAFT_HTTP_${response.status}`);
    if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('CLOUD_DRAFT_RESPONSE_TOO_LARGE');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('CLOUD_DRAFT_INVALID_RESPONSE');
    const chunks = []; let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > maxBytes) throw new Error('CLOUD_DRAFT_RESPONSE_TOO_LARGE');
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error('CLOUD_DRAFT_INVALID_JSON'); }
  } catch (error) {
    if (timeout.aborted || error?.name === 'TimeoutError') throw new Error('CLOUD_DRAFT_FETCH_TIMEOUT');
    if (error instanceof Error && /^CLOUD_DRAFT_[A-Z0-9_]+$/.test(error.message)) throw error;
    throw new Error('CLOUD_DRAFT_FETCH_FAILED');
  }
}

/** Fixed public source; JSON data only. Never executes repository code or follows its URLs. */
export async function readCloudDrafts({ now = new Date(), fetcher = fetch } = {}) {
  const today = easternDate(now);
  const ref = await readJson(`${API}/git/ref/heads/main`, fetcher, 16_384);
  if (ref?.ref !== 'refs/heads/main' || ref.object?.type !== 'commit' || !SHA.test(ref.object?.sha ?? '')) {
    throw new Error('CLOUD_DRAFT_INVALID_COMMIT');
  }
  const commit = ref.object.sha;
  const listing = await readJson(`${API}/contents/${DIRECTORY}?ref=${commit}`, fetcher, 2_000_000);
  // GitHub's contents endpoint caps directories at 1,000 entries; do not mistake
  // a potentially truncated listing for an exhaustive view of today's drafts.
  if (!Array.isArray(listing) || listing.length >= 1000) throw new Error('CLOUD_DRAFT_INVALID_LISTING');
  const selected = listing.filter(entry => typeof entry?.name === 'string' && entry.name.startsWith(`${today}-`));
  if (selected.length > 2) throw new Error('CLOUD_DRAFT_LIMIT_EXCEEDED');
  const names = new Set();
  for (const entry of selected) {
    if (!new RegExp(`^${today}-[a-z0-9]+(?:-[a-z0-9]+)*\\.json$`).test(entry.name)
      || entry.name.length > 180 || entry.path !== `${DIRECTORY}/${entry.name}` || entry.type !== 'file'
      || !SHA.test(entry.sha ?? '') || names.has(entry.name)
      || !Number.isSafeInteger(entry.size) || entry.size < 1 || entry.size > MAX_ARTICLE_BYTES) {
      throw new Error('CLOUD_DRAFT_INVALID_ARTIFACT');
    }
    names.add(entry.name);
  }
  const artifacts = [];
  for (const entry of selected.sort((a, b) => a.name.localeCompare(b.name))) {
    const blob = await readJson(`${API}/git/blobs/${entry.sha}`, fetcher, 400_000);
    if (blob?.encoding !== 'base64' || blob.sha !== entry.sha || blob.size !== entry.size || typeof blob.content !== 'string') {
      throw new Error('CLOUD_DRAFT_INVALID_BLOB');
    }
    const encoded = blob.content.replace(/[\r\n]/g, '');
    if (encoded.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(encoded)) {
      throw new Error('CLOUD_DRAFT_INVALID_BLOB');
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.toString('base64') !== encoded || bytes.length !== entry.size || bytes.length > MAX_ARTICLE_BYTES) {
      throw new Error('CLOUD_DRAFT_INVALID_BLOB');
    }
    const blobSha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (blobSha !== entry.sha) throw new Error('CLOUD_DRAFT_HASH_MISMATCH');
    let article;
    try { article = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw new Error('CLOUD_DRAFT_INVALID_ARTICLE'); }
    if (!article || typeof article !== 'object' || Array.isArray(article)) throw new Error('CLOUD_DRAFT_INVALID_ARTICLE');
    artifacts.push({ commit, path: entry.path, blobSha, sha256: createHash('sha256').update(bytes).digest('hex'), article });
  }
  return { date: today, commit, artifacts };
}
