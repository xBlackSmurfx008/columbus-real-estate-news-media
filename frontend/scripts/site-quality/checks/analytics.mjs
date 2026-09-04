// Analytics events.
//
// The failure this check exists for is silence. Telemetry that stops working
// looks exactly like telemetry reporting a quiet week: the number goes down and
// nobody can tell the difference. (This property already lost 34 consecutive
// scheduled runs to that shape of failure.) So the check asks three separate
// questions, and answers each one with evidence:
//
//   mounted  - is the instrumentation still in the tree at all? (source check,
//              runs anywhere, needs neither network nor credentials)
//   flowing  - has the pipeline written anything recently? (database check)
//   writable - does an event posted right now actually land, correctly
//              classified? (write-path check, non-production targets only)

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FUNNEL_SLUGS, FUNNEL_STAGES } from "../../funnel-lib.mjs";
import { realTrafficSql, tableColumns } from "../../test-traffic-lib.mjs";
import { openDatabase, tableExists } from "../db.mjs";
import { fail, pass, skip, verdict } from "../result.mjs";
import { FRONTEND_ROOT } from "../spawn.mjs";
import { url as targetUrl } from "../target.mjs";

const REQUIRED_TRACKERS = [
  { component: "PageviewTracker", records: "page_views" },
  { component: "FunnelTracker", records: "funnel_events" },
];

export const analyticsMounted = {
  id: "analytics-mounted",
  title: "Analytics instrumentation is mounted",
  blocking: true,
  async run() {
    const layoutPath = join(FRONTEND_ROOT, "app", "layout.tsx");
    if (!existsSync(layoutPath)) {
      return skip("analytics-mounted", "Analytics instrumentation is mounted", true, "app/layout.tsx not found in this checkout");
    }
    const layout = readFileSync(layoutPath, "utf8");
    const findings = [];
    for (const tracker of REQUIRED_TRACKERS) {
      if (!layout.includes(`<${tracker.component}`)) {
        findings.push(`app/layout.tsx no longer mounts <${tracker.component} /> — nothing will write ${tracker.records}`);
      }
    }
    return verdict(
      "analytics-mounted",
      "Analytics instrumentation is mounted",
      true,
      findings,
      `root layout mounts ${REQUIRED_TRACKERS.map((tracker) => tracker.component).join(" and ")}`,
      `${findings.length} tracker(s) missing from the root layout`,
    );
  },
};

export const analyticsFlowing = {
  id: "analytics-flowing",
  title: "Analytics events are still arriving",
  blocking: true,
  async run(context) {
    const { sql, reason } = await openDatabase();
    if (!sql) return skip("analytics-flowing", "Analytics events are still arriving", true, reason);

    const now = context.now ?? new Date();
    const maxSilenceDays = context.options.analyticsSilenceDays;
    const blocking = [];
    const advisory = [];
    const stats = {};

    // page_views: the site takes organic traffic every day. Silence here means
    // the pipeline is broken, and it is blocking because no deploy should ship
    // while the only measurement channel is dark.
    if (!(await tableExists(sql, "page_views"))) {
      blocking.push("page_views table does not exist — nothing is recording traffic");
    } else {
      const [row] = await sql`SELECT COUNT(*)::int AS n, MAX(created_at) AS latest FROM page_views`;
      stats.pageViews = { rows: row.n, latest: row.latest };
      if (row.n === 0 || !row.latest) {
        blocking.push("page_views has no rows at all — pageview telemetry has never recorded anything");
      } else {
        const ageDays = Math.floor((now.getTime() - new Date(row.latest).getTime()) / 86_400_000);
        stats.pageViews.ageDays = ageDays;
        if (ageDays > maxSilenceDays) {
          blocking.push(`page_views has recorded nothing for ${ageDays} days (newest ${new Date(row.latest).toISOString()}); the pageview pipeline is silently down`);
        }
      }
    }

    // funnel_events: advisory, deliberately. The funnel chain is new code that
    // is not deployed yet, so an empty table is a true statement about the
    // world rather than a regression — and making it blocking would block the
    // very deploy that fills it. It is still reported as a FAIL so it cannot be
    // mistaken for healthy.
    if (!(await tableExists(sql, "funnel_events"))) {
      advisory.push("funnel_events table does not exist — run npm run newsroom:migrate-funnel-events");
    } else {
      const columns = await tableColumns(sql, "funnel_events");
      const [row] = await sql.query(
        `SELECT COUNT(*)::int AS n, MAX(created_at) AS latest FROM funnel_events WHERE ${realTrafficSql("funnel_events", columns)}`,
      );
      stats.funnelEvents = { realRows: row.n, latest: row.latest };
      if (row.n === 0) {
        advisory.push(`funnel_events holds zero real events across ${FUNNEL_SLUGS.length} funnels and ${FUNNEL_STAGES.length} stages — the funnel chain has never measured anything on this target`);
      } else {
        const stages = await sql`SELECT DISTINCT stage FROM funnel_events`;
        const seen = new Set(stages.map((entry) => entry.stage));
        const missing = ["funnel_view", "cta_click"].filter((stage) => !seen.has(stage));
        if (missing.length > 0) advisory.push(`funnel_events has rows but never recorded: ${missing.join(", ")}`);
      }
    }

    if (blocking.length > 0) {
      return fail("analytics-flowing", "Analytics events are still arriving", true, `${blocking.length} analytics pipeline(s) are dark`, [...blocking, ...advisory], stats);
    }
    if (advisory.length > 0) {
      return fail("analytics-flowing", "Analytics events are still arriving", false, `${advisory.length} analytics stream(s) have no data yet`, advisory, stats);
    }
    return pass("analytics-flowing", "Analytics events are still arriving", true, "pageview and funnel telemetry are both recording", stats);
  },
};

export const analyticsWritable = {
  id: "analytics-writable",
  title: "A funnel event posted now actually lands",
  blocking: true,
  async run(context) {
    const { target, http } = context;
    if (!target.writesAllowed) {
      return skip(
        "analytics-writable",
        "A funnel event posted now actually lands",
        true,
        `write-path checks are disabled against production (${target.origin}); run with --target local, or --allow-write to post a test-traffic-marked event and delete it`,
      );
    }
    const { sql, reason } = await openDatabase();
    if (!sql) {
      return skip("analytics-writable", "A funnel event posted now actually lands", true, `${reason} — an event can be posted but not verified, which would prove nothing`);
    }
    if (!(await tableExists(sql, "funnel_events"))) {
      return fail("analytics-writable", "A funnel event posted now actually lands", true, "funnel_events table is missing", [
        "funnel_events does not exist on this database; run npm run newsroom:migrate-funnel-events",
      ]);
    }

    // `smoke:` is the canonical marker in scripts/test-traffic-lib.mjs, so this
    // row is classified as test traffic at write time by the route itself.
    const marker = `smoke:site-quality-${Date.now()}`;
    const response = await http.post(targetUrl(target, "/api/funnel/event"), {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        funnel: FUNNEL_SLUGS[0],
        stage: "funnel_view",
        path: "/sell/your-home",
        campaignSource: marker,
        placement: "site-quality-gate",
      }),
    });

    const findings = [];
    if (response.status !== 204) findings.push(`POST /api/funnel/event returned ${response.status ?? response.error}, expected 204`);

    const rows = await sql`SELECT id, is_test FROM funnel_events WHERE campaign_source = ${marker}`;
    if (rows.length === 0) {
      findings.push("the posted event did not reach funnel_events — the capture path accepted it and dropped it");
    } else {
      if (rows.some((row) => row.is_test !== true)) {
        findings.push(`a smoke-marked event was stored with is_test = false; scripts/test-traffic-lib.mjs is not being applied at write time`);
      }
      await sql`DELETE FROM funnel_events WHERE campaign_source = ${marker}`;
    }

    return verdict(
      "analytics-writable",
      "A funnel event posted now actually lands",
      true,
      findings,
      "a funnel event posted to the target was stored, flagged as test traffic, and removed",
      `${findings.length} problem(s) in the funnel event capture path`,
      { target: target.origin, wrote: true, cleanedUp: true },
    );
  },
};
