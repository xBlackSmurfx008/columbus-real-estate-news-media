// Minimal, dependency-free HTML inspection.
//
// Deliberately regex-based rather than a DOM parser: this suite has to be
// runnable from a bare checkout (a GitHub Actions job with no `npm install`,
// or a machine without node_modules) so a broken dependency tree can never be
// the reason nobody notices the site is broken. Every helper is exported and
// unit-tested in tests/site-quality.test.mjs.

const TAG_RE = /<(a|link|script|meta|img)\b([^>]*)>/gi;

/**
 * Decode the entities an HTML serializer puts inside attribute values.
 * Skipping this is how a checker convinces itself every image on the site is
 * broken: Next.js writes `/_next/image?url=…&amp;w=3840`, and fetching that
 * literal string gets an HTTP 400 from a perfectly healthy endpoint.
 */
export function decodeEntities(value) {
  return String(value)
    .replace(/&(?:#39|#x27|apos);/g, "'")
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

function parseAttributes(raw) {
  const attributes = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>`]+))/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? "");
  }
  return attributes;
}

/** All `<a|link|script|meta|img>` tags as {tag, attributes}. */
export function tags(html) {
  const found = [];
  let match;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(html)) !== null) {
    found.push({ tag: match[1].toLowerCase(), attributes: parseAttributes(match[2]) });
  }
  return found;
}

export function anchors(html) {
  return tags(html)
    .filter((entry) => entry.tag === "a" && typeof entry.attributes.href === "string")
    .map((entry) => ({ href: entry.attributes.href, rel: entry.attributes.rel ?? "", attributes: entry.attributes }));
}

export function metaContent(html, name) {
  const lower = name.toLowerCase();
  for (const entry of tags(html)) {
    if (entry.tag !== "meta") continue;
    const key = (entry.attributes.name ?? entry.attributes.property ?? "").toLowerCase();
    if (key === lower) return entry.attributes.content ?? "";
  }
  return null;
}

/** Every `<link rel="canonical">` href, in document order. Duplicates matter. */
export function canonicalHrefs(html) {
  return tags(html)
    .filter((entry) => entry.tag === "link" && (entry.attributes.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"))
    .map((entry) => entry.attributes.href ?? "");
}

/** Parsed `application/ld+json` blocks. Unparseable blocks come back as errors. */
export function jsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      blocks.push({ ok: true, data: JSON.parse(raw), raw });
    } catch (error) {
      blocks.push({ ok: false, data: null, raw, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return blocks;
}

/** Flatten @graph containers so a caller can just look for a @type. */
export function jsonLdNodes(html) {
  const nodes = [];
  for (const block of jsonLdBlocks(html)) {
    if (!block.ok) continue;
    const queue = Array.isArray(block.data) ? [...block.data] : [block.data];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node["@graph"])) queue.push(...node["@graph"]);
      nodes.push(node);
    }
  }
  return nodes;
}

export function hasNoindex(html) {
  const robots = metaContent(html, "robots");
  if (typeof robots !== "string") return false;
  return /\bnoindex\b/i.test(robots);
}

export function title(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
}

/** Visible-ish text: strips script/style/tags and decodes the entities we emit. */
export function textContent(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Same-origin link targets worth checking, as normalized paths.
 * Skips anchors, mailto/tel, and the outbound redirector (/go/*, which is an
 * affiliate hop and must not be followed by an automated check).
 */
export function internalPaths(html, origin) {
  const seen = new Set();
  for (const anchor of anchors(html)) {
    const href = anchor.href.trim();
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    let path;
    if (href.startsWith("/")) {
      path = href;
    } else if (/^https?:\/\//i.test(href)) {
      let parsed;
      try {
        parsed = new URL(href);
      } catch {
        continue;
      }
      if (parsed.origin !== origin) continue;
      path = `${parsed.pathname}${parsed.search}`;
    } else {
      continue;
    }
    path = path.split("#")[0];
    if (!path) continue;
    if (path.startsWith("/go/")) continue;
    seen.add(path);
  }
  return [...seen];
}

/** Absolute off-site link targets, deduped by full URL. */
export function externalUrls(html, origin) {
  const seen = new Set();
  for (const anchor of anchors(html)) {
    const href = anchor.href.trim();
    if (!/^https?:\/\//i.test(href)) continue;
    let parsed;
    try {
      parsed = new URL(href);
    } catch {
      continue;
    }
    if (parsed.origin === origin) continue;
    seen.add(parsed.toString());
  }
  return [...seen];
}
