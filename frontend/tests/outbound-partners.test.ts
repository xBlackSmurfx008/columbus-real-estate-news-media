import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTBOUND_DESTINATIONS,
  OUTBOUND_INTENTS,
  OUTBOUND_PARTNERS,
  isPlaceholderUrl,
  outboundDestination,
  outboundDestinationsFor,
  outboundHref,
  outboundLinksFor,
  outboundPartner,
  resolveAffiliateUrl,
  type AffiliateProgram,
} from "../lib/outbound-partners.ts";
import { groupRequiresDisclosure } from "../lib/affiliate-disclosure.ts";
import { normalizeAffiliateClick } from "../lib/affiliate-clicks.ts";

const AREA = "Columbus and Central Ohio";

function program(overrides: Partial<AffiliateProgram> = {}): AffiliateProgram {
  return {
    partner_slug: "zillow",
    program_name: null,
    partner_id: null,
    tracking_url_template: null,
    status: "unconfigured",
    notes: null,
    ...overrides,
  };
}

// --- the registry itself ------------------------------------------------------

test("every destination has a known partner, a known intent, and a unique key", () => {
  const keys = new Set<string>();
  for (const destination of OUTBOUND_DESTINATIONS) {
    assert.ok(!keys.has(destination.key), `duplicate destination key ${destination.key}`);
    keys.add(destination.key);
    assert.ok(outboundPartner(destination.partner), `unknown partner ${destination.partner}`);
    assert.ok(
      (OUTBOUND_INTENTS as readonly string[]).includes(destination.intent),
      `unknown intent ${destination.intent}`,
    );
    assert.equal(outboundDestination(destination.key)?.key, destination.key);
  }
});

test("no destination URL is a placeholder or a fabricated affiliate link", () => {
  for (const destination of OUTBOUND_DESTINATIONS) {
    for (const area of [AREA, "Dublin", "German Village"]) {
      const url = destination.url(area);
      assert.ok(url.startsWith("https://"), `${destination.key} must be https`);
      assert.equal(isPlaceholderUrl(url), false, `${destination.key} is a placeholder`);
      // A real affiliate link always carries an id parameter. None may be
      // hardcoded here: the registry describes plain public destinations only.
      assert.doesNotMatch(
        url,
        /[?&](aff|affiliate|partner|pid|subid|irclickid|tag|ref|utm_source)=/i,
        `${destination.key} must not carry a tracking parameter in code`,
      );
      assert.ok(
        url.includes(outboundPartner(destination.partner)!.host),
        `${destination.key} must point at its own partner's host`,
      );
    }
  }
});

test("each partner appears at most once per intent, so no comparison set is stacked", () => {
  for (const intent of OUTBOUND_INTENTS) {
    const partners = outboundDestinationsFor(intent).map((destination) => destination.partner);
    assert.equal(new Set(partners).size, partners.length, `${intent} repeats a partner`);
  }
});

// --- editorial neutrality -----------------------------------------------------

test("the comparison set for each intent is pinned, so a paying partner cannot crowd one out", () => {
  // Deleting or reordering a line here is a deliberate editorial act, not a
  // side effect of a monetization change. Owner plan item 10: "editorial
  // neutrality preserved"; sales principle 23 outranks 25.
  assert.deepEqual(
    outboundDestinationsFor("buy").map((destination) => destination.key),
    ["realtor-com-buy", "zillow-buy", "redfin-buy", "homes-com-buy"],
  );
  assert.deepEqual(
    outboundDestinationsFor("rent").map((destination) => destination.key),
    ["apartments-com-rent", "zillow-rent", "realtor-com-rent", "affordablehousing-com-rent"],
  );
  assert.deepEqual(
    outboundDestinationsFor("list-rental").map((destination) => destination.key),
    ["zillow-list-rental", "apartments-com-list-rental", "realtor-com-list-rental"],
  );
});

test("monetizing one partner changes no other link's presence, order, or URL", () => {
  const paid = new Map<string, AffiliateProgram>([
    [
      "zillow",
      program({
        status: "active",
        program_name: "Example Program",
        partner_id: "TEST-ID",
        tracking_url_template: "https://track.example-network.test/c?a={{PARTNER_ID}}&u={{DESTINATION}}",
      }),
    ],
  ]);

  for (const intent of OUTBOUND_INTENTS) {
    const neutral = outboundLinksFor(intent, AREA, null);
    const monetized = outboundLinksFor(intent, AREA, paid);

    assert.deepEqual(
      monetized.map((link) => link.key),
      neutral.map((link) => link.key),
      `${intent}: membership or order changed with money attached`,
    );
    assert.deepEqual(
      monetized.map((link) => link.destinationUrl),
      neutral.map((link) => link.destinationUrl),
      `${intent}: a destination URL changed for a non-paying partner`,
    );
    for (const link of monetized) {
      assert.equal(
        link.sponsored,
        link.partner === "zillow",
        `${link.key}: sponsored flag must follow the program, nothing else`,
      );
    }
  }
});

// --- no invented relationships ------------------------------------------------

test("today every partner link is unsponsored, because no program is configured", () => {
  for (const intent of OUTBOUND_INTENTS) {
    for (const link of outboundLinksFor(intent, AREA, new Map())) {
      assert.equal(link.sponsored, false, `${link.key} claimed a relationship that does not exist`);
    }
  }
});

test("resolveAffiliateUrl refuses everything short of a real, active, complete program", () => {
  const destination = "https://www.zillow.com/columbus-oh/";
  const complete = {
    status: "active" as const,
    partner_id: "PUB-1234",
    tracking_url_template: "https://track.example-network.test/c?a={{PARTNER_ID}}&u={{DESTINATION}}",
  };

  assert.equal(resolveAffiliateUrl(null, destination), null, "no row");
  assert.equal(resolveAffiliateUrl(program(), destination), null, "unconfigured");
  assert.equal(
    resolveAffiliateUrl(program({ ...complete, status: "pending" }), destination),
    null,
    "pending is not live",
  );
  assert.equal(
    resolveAffiliateUrl(program({ ...complete, partner_id: "  " }), destination),
    null,
    "blank partner id",
  );
  assert.equal(
    resolveAffiliateUrl(program({ ...complete, tracking_url_template: null }), destination),
    null,
    "no template",
  );
  assert.equal(
    resolveAffiliateUrl(
      program({ ...complete, tracking_url_template: "https://track.example-network.test/c?u={{DESTINATION}}" }),
      destination,
    ),
    null,
    "template that never uses the partner id",
  );
  assert.equal(
    resolveAffiliateUrl(
      program({ ...complete, tracking_url_template: "http://track.example-network.test/c?a={{PARTNER_ID}}" }),
      destination,
    ),
    null,
    "non-https",
  );
  assert.equal(
    resolveAffiliateUrl(
      program({ ...complete, tracking_url_template: "https://www.example.com/c?a={{PARTNER_ID}}" }),
      destination,
    ),
    null,
    "placeholder host",
  );

  const resolved = resolveAffiliateUrl(program(complete), destination);
  assert.equal(
    resolved,
    `https://track.example-network.test/c?a=PUB-1234&u=${encodeURIComponent(destination)}`,
  );
});

// --- FTC disclosure invariant -------------------------------------------------

test("a group shows the FTC disclosure exactly when it contains a paid link", () => {
  assert.equal(groupRequiresDisclosure([]), false);
  assert.equal(groupRequiresDisclosure([{ sponsored: false }, { sponsored: false }]), false);
  assert.equal(groupRequiresDisclosure([{ sponsored: false }, { sponsored: true }]), true);
  assert.equal(groupRequiresDisclosure([{ sponsored: true }]), true);
});

test("only the disclosure-bound component may render a sponsored link", async () => {
  // The rule from .claude/skills/cren-sales is structural, not procedural:
  // rel="sponsored" exists in exactly one file, the one that also renders the
  // disclosure. If a new component starts emitting it, this fails.
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");

  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry)) continue;
      if (full.endsWith(join("components", "outbound-link-group.tsx"))) continue;
      if (readFileSync(full, "utf8").includes('rel="sponsored')) offenders.push(full);
    }
  };
  for (const dir of ["components", "app"]) walk(join(process.cwd(), dir));

  assert.deepEqual(offenders, [], "sponsored links must go through OutboundLinkGroup");
});

// --- tracked href + click record ---------------------------------------------

test("the tracked href is same-origin and carries no redirect target", () => {
  const href = outboundHref("zillow-buy", {
    page: "/housing-search",
    area: "Dublin",
    placement: "housing-search-buy",
  });
  assert.ok(href.startsWith("/go/zillow-buy?"), href);
  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("from"), "/housing-search");
  assert.equal(params.get("area"), "Dublin");
  assert.equal(params.get("placement"), "housing-search-buy");
  // No parameter may name an external destination, or /go becomes an open redirect.
  for (const [, value] of params) assert.doesNotMatch(value, /^https?:\/\//i);
});

test("a click record carries partner, page, area and intent", () => {
  const row = normalizeAffiliateClick({
    partnerSlug: "zillow",
    destinationKey: "zillow-buy",
    page: "/housing-search",
    area: "Dublin",
    intent: "buy",
    placement: "housing-search-buy",
    destinationHost: "zillow.com",
    isAffiliate: false,
  });
  assert.ok(row);
  assert.equal(row.partner_slug, "zillow");
  assert.equal(row.path, "/housing-search");
  assert.equal(row.area, "Dublin");
  assert.equal(row.intent, "buy");
  assert.equal(row.placement, "housing-search-buy");
  assert.equal(row.is_affiliate, false);
  assert.equal(row.is_test, false);
  assert.equal(row.exclusion_reason, null);
});

test("an unknown intent is dropped rather than stored as a made-up dimension", () => {
  const row = normalizeAffiliateClick({ partnerSlug: "zillow", intent: "refinance" });
  assert.equal(row?.intent, null);
});

test("a click with no partner is not recordable", () => {
  assert.equal(normalizeAffiliateClick({ partnerSlug: "  " }), null);
});

test("smoke-marked and bot clicks are excluded at write time, with a reason", () => {
  const smoke = normalizeAffiliateClick({
    partnerSlug: "zillow",
    campaignSource: "smoke:housing-search",
  });
  assert.equal(smoke?.is_test, true);
  assert.equal(smoke?.exclusion_reason, "test-source");

  const legacy = normalizeAffiliateClick({ partnerSlug: "zillow", campaignSource: "crm-test" });
  assert.equal(legacy?.is_test, true);

  const bot = normalizeAffiliateClick({ partnerSlug: "zillow", isBot: true });
  assert.equal(bot?.is_test, true);
  assert.equal(bot?.exclusion_reason, "bot-user-agent");
});

// --- area handling ------------------------------------------------------------

test("an area narrows every portal URL it can and is echoed into the click", () => {
  const links = outboundLinksFor("buy", "Dublin");
  assert.equal(links.length, 4);
  for (const link of links) {
    assert.match(link.destinationUrl, /dublin/i, `${link.key} ignored the selected area`);
  }
  // Rental-manager products are account tools, not area searches; they stay put.
  for (const link of outboundLinksFor("list-rental", "Dublin")) {
    assert.equal(link.destinationUrl, outboundDestination(link.key)!.url(""));
  }
});

test("every registry partner is a distinct company with a distinct host", () => {
  const slugs = OUTBOUND_PARTNERS.map((partner) => partner.slug);
  const hosts = OUTBOUND_PARTNERS.map((partner) => partner.host);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(new Set(hosts).size, hosts.length);
});
