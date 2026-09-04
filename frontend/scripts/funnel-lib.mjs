// Shared definitions for the four CREN revenue funnels (owner plan
// 2026-09-04, P0 item 2). Imported by the Next.js capture routes/components
// AND by scripts/kpi-report.mjs, so page, event, and report can never disagree
// about what a funnel or a stage is.

/** The chain every funnel is measured against, in order. */
export const FUNNEL_STAGES = [
  "funnel_view",
  "cta_click",
  "form_start",
  "form_submit",
  "contacted",
  "qualified",
  "opportunity",
  "closed",
];

/** Stages a browser is allowed to report. Everything later is server-derived. */
export const CLIENT_FUNNEL_STAGES = ["funnel_view", "cta_click", "form_start", "form_submit"];

export const FUNNELS = [
  {
    slug: "fsbo_seller",
    label: "FSBO / home seller",
    path: "/sell/your-home",
    persona: "fsbo_seller",
  },
  {
    slug: "investor_seller",
    label: "Investor property seller",
    path: "/sell/investment-property",
    persona: "investor_seller",
  },
  {
    slug: "capital_partner",
    label: "Capital partner",
    path: "/invest/deploy-capital",
    persona: "capital_partner",
  },
  {
    slug: "renter",
    label: "Renter",
    path: "/rent/find-a-home",
    persona: "renter",
  },
];

export const FUNNEL_SLUGS = FUNNELS.map((funnel) => funnel.slug);
export const FUNNEL_PATHS = FUNNELS.map((funnel) => funnel.path);

const bySlug = new Map(FUNNELS.map((funnel) => [funnel.slug, funnel]));
const byPath = new Map(FUNNELS.map((funnel) => [funnel.path, funnel]));
const byPersona = new Map(FUNNELS.map((funnel) => [funnel.persona, funnel]));

export function isFunnelSlug(value) {
  return typeof value === "string" && bySlug.has(value);
}

export function isFunnelStage(value) {
  return typeof value === "string" && FUNNEL_STAGES.includes(value);
}

export function funnelBySlug(slug) {
  return bySlug.get(slug) ?? null;
}

/** Map a request path (query already stripped) onto a funnel. */
export function funnelForPath(path) {
  if (typeof path !== "string") return null;
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return byPath.get(clean) ?? null;
}

/** Map a lead persona onto a funnel; non-funnel personas return null. */
export function funnelForPersona(persona) {
  return byPersona.get(persona) ?? null;
}

/**
 * Lead status -> funnel stage. `new` is already covered by form_submit, so it
 * produces no extra event. Anything unknown produces null and is not recorded.
 */
export function stageForLeadStatus(status) {
  switch (status) {
    case "contacted":
      return "contacted";
    case "qualified":
      return "qualified";
    case "opportunity":
      return "opportunity";
    case "won":
    case "lost":
    case "closed":
      return "closed";
    default:
      return null;
  }
}

/** Statuses the admin queue may set, in funnel order. */
export const LEAD_STATUSES = ["new", "contacted", "qualified", "opportunity", "won", "lost"];

/** Statuses that count as a qualified lead for the qualification rate. */
export const QUALIFIED_STATUSES = ["qualified", "opportunity", "won"];
