// Fetch layer for the site-quality suite.
//
// Two things this module exists to guarantee:
//   1. ONE request per URL per run. CLAUDE.md's sourcing etiquette ("one fetch
//      per page per run — no crawling, no hammering") applies to our own site
//      too: a dozen checks each pulling the homepage would be a dozen requests.
//      Every check goes through the shared cache below instead.
//   2. Timings are recorded on the way through, so the performance check
//      measures the same responses the other checks already paid for rather
//      than issuing a second wave of traffic.

export const USER_AGENT = "CREN-site-quality/1.0 (+https://columbusrealestatenews.com)";

export function createHttpClient({ timeoutMs = 20_000, fetchImpl = fetch } = {}) {
  /** @type {Map<string, Promise<object>>} */
  const cache = new Map();
  /** @type {Array<{url: string, status: number|null, ms: number, bytes: number}>} */
  const timings = [];

  async function request(url, { method = "GET", headers = {}, body = null, cacheable = true } = {}) {
    const key = `${method} ${url}`;
    if (cacheable && cache.has(key)) return cache.get(key);

    const started = Date.now();
    const promise = (async () => {
      try {
        const response = await fetchImpl(url, {
          method,
          redirect: "follow",
          headers: { "user-agent": USER_AGENT, ...headers },
          ...(body === null ? {} : { body }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const isHtmlish = method !== "HEAD";
        const text = isHtmlish ? await response.text() : "";
        const record = {
          url,
          finalUrl: response.url || url,
          ok: response.ok,
          status: response.status,
          headers: response.headers,
          contentType: response.headers.get("content-type") ?? "",
          text,
          bytes: Buffer.byteLength(text, "utf8"),
          ms: Date.now() - started,
          error: null,
        };
        timings.push({ url, status: record.status, ms: record.ms, bytes: record.bytes });
        return record;
      } catch (error) {
        const record = {
          url,
          finalUrl: url,
          ok: false,
          status: null,
          headers: new Headers(),
          contentType: "",
          text: "",
          bytes: 0,
          ms: Date.now() - started,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        };
        timings.push({ url, status: null, ms: record.ms, bytes: 0 });
        return record;
      }
    })();

    if (cacheable) cache.set(key, promise);
    return promise;
  }

  return {
    get: (url, options) => request(url, { ...options, method: "GET" }),
    head: (url, options) => request(url, { ...options, method: "HEAD" }),
    /** Uncached POST — used only by write-path checks, which must not dedupe. */
    post: (url, options) => request(url, { ...options, method: "POST", cacheable: false }),
    timings: () => [...timings],
    requestCount: () => timings.length,
  };
}

/** Run `worker` over `items` with bounded concurrency. */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
