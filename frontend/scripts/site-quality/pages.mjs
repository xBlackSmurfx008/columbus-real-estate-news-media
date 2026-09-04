// One fetched copy of each corpus page, shared by every check.
//
// The link, canonical, schema, indexability, disclosure, analytics and
// performance checks all need the same HTML. Fetching it once here is what
// keeps a full run to roughly one request per page.

import { mapLimit } from "./http.mjs";
import { url as targetUrl } from "./target.mjs";

export async function fetchPages(http, target, paths, { concurrency = 6 } = {}) {
  const entries = await mapLimit(paths, concurrency, async (path) => {
    const response = await http.get(targetUrl(target, path));
    return [path, response];
  });
  return new Map(entries);
}

/** Pages that came back as renderable HTML — the only ones content checks can judge. */
export function htmlPages(pages) {
  const usable = new Map();
  for (const [path, response] of pages) {
    if (response.ok && response.contentType.includes("text/html")) usable.set(path, response);
  }
  return usable;
}
