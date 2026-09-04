import assert from "node:assert/strict";
import test from "node:test";
import { resolveArticleCta } from "../lib/article-cta.ts";
import { summarizeArticleCtaPerformance, type StoredActivationEvent } from "../lib/activation-analytics.ts";

test("neighborhood stories with a real area get the area-follow action", () => {
  const cta = resolveArticleCta({
    category: "Neighborhoods",
    topic_slug: "market-trends",
    area_slug: "german-village",
    tags: ["columbus-ohio", "neighborhood", "german-village"],
  });
  assert.equal(cta.kind, "area_follow");
  assert.equal(cta.funnel, "area_follow");
});

test("a neighborhood story with an unknown area falls through to another funnel", () => {
  const cta = resolveArticleCta({
    category: "Neighborhoods",
    topic_slug: "development",
    area_slug: "not-a-real-area",
    tags: ["neighborhood", "affordable-housing"],
  }, { isFollowableArea: () => false });
  assert.equal(cta.funnel, "renter");
});

test("renter stories route to the rental funnel", () => {
  const cta = resolveArticleCta({
    category: "Rental Market",
    topic_slug: "development",
    area_slug: "canal-winchester",
    tags: ["rental-market"],
  });
  assert.equal(cta.funnel, "renter");
  assert.equal(cta.kind === "link" && cta.href, "/rent/find-a-home");
});

test("market-data stories route to the home seller funnel", () => {
  const cta = resolveArticleCta({
    category: "Market Analysis",
    topic_slug: "market-trends",
    area_slug: "columbus-citywide",
    tags: ["market-trends", "housing-inventory"],
  });
  assert.equal(cta.funnel, "home_seller");
  assert.equal(cta.kind === "link" && cta.href, "/sell/your-home");
});

test("rental-owner stories route to the investment-property funnel", () => {
  const cta = resolveArticleCta({
    category: "Commercial",
    topic_slug: "local-politics",
    area_slug: "columbus-citywide",
    tags: ["multifamily"],
  });
  assert.equal(cta.funnel, "investor_seller");
  assert.equal(cta.kind === "link" && cta.href, "/sell/investment-property");
});

test("development stories route to the capital funnel with the securities note", () => {
  const cta = resolveArticleCta({
    category: "Development",
    topic_slug: "development",
    area_slug: "dublin",
    tags: ["development", "mixed-use"],
  });
  assert.equal(cta.funnel, "capital");
  assert.equal(cta.kind === "link" && cta.href, "/invest/deploy-capital");
  assert.ok(cta.kind === "link" && cta.note?.includes("not an offer to sell"));
});

test("lifestyle stories fall back to free membership", () => {
  const cta = resolveArticleCta({
    category: "Lifestyle",
    topic_slug: "events-lifestyle",
    area_slug: "downtown-columbus",
    tags: ["events-lifestyle", "food-drink"],
  });
  assert.equal(cta.funnel, "membership");
  assert.ok(cta.kind === "link" && cta.href.startsWith("/subscribe"));
});

test("no CTA copy promises a newsletter that has already launched", () => {
  const cta = resolveArticleCta({ category: "Lifestyle", topic_slug: "events-lifestyle", tags: [] });
  assert.ok(cta.kind === "link");
  const copy = `${cta.heading} ${cta.body} ${cta.note ?? ""}`.toLowerCase();
  assert.ok(!copy.includes("every tuesday"));
  assert.ok(!copy.includes("—"), "no em dashes in CTA body copy");
});

test("CTA performance summary reports CTR per funnel and placement", () => {
  const events: StoredActivationEvent[] = [
    { name: "article_cta_view", path: "/blog/a", timestamp: "2026-09-04T12:00:00.000Z", payload: { funnel: "home_seller", placement: "article_body_end" } },
    { name: "article_cta_view", path: "/blog/b", timestamp: "2026-09-04T12:01:00.000Z", payload: { funnel: "home_seller", placement: "article_body_end" } },
    { name: "article_cta_click", path: "/blog/a", timestamp: "2026-09-04T12:02:00.000Z", payload: { funnel: "home_seller", placement: "article_body_end" } },
  ];
  const [row] = summarizeArticleCtaPerformance(events);
  assert.equal(row.funnel, "home_seller");
  assert.equal(row.views, 2);
  assert.equal(row.clicks, 1);
  assert.equal(row.ctr, 50);
});
