// Target resolution for the site-quality suite.
//
// Every check runs against a *target*: an origin plus the facts that decide
// what the suite is allowed to do there. The one rule that matters is that a
// write-path check (submitting a lead form, emitting a funnel event) must never
// touch production data unless a human explicitly asks for it AND the write is
// marked as test traffic by the canonical predicate.

export const PRODUCTION_ORIGIN = "https://columbusrealestatenews.com";
export const LOCAL_ORIGIN = "http://localhost:3000";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

export function resolveTarget(value, { allowWrite = false } = {}) {
  const raw = String(value ?? "production").trim();
  let origin;
  if (raw === "production" || raw === "prod") origin = PRODUCTION_ORIGIN;
  else if (raw === "local" || raw === "localhost") origin = LOCAL_ORIGIN;
  else origin = raw;

  let url;
  try {
    url = new URL(origin);
  } catch {
    throw new Error(`--target must be "production", "local", or an absolute URL (got: ${raw})`);
  }
  if (url.username || url.password) throw new Error("--target must not include credentials");
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";

  const normalized = url.toString().replace(/\/$/, "");
  const isLocal = LOCAL_HOSTS.has(url.hostname);
  const isProduction = normalized === PRODUCTION_ORIGIN || url.hostname === "columbusrealestatenews.com";

  return {
    label: raw,
    origin: normalized,
    hostname: url.hostname,
    isLocal,
    isProduction,
    // Write-path checks run freely off production; on production they need an
    // explicit human opt-in, and even then they are test-traffic marked.
    writesAllowed: allowWrite || !isProduction,
    writeOptIn: allowWrite,
  };
}

export function url(target, path) {
  return `${target.origin}${path.startsWith("/") ? path : `/${path}`}`;
}
