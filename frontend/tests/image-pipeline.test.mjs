import assert from "node:assert/strict";
import test from "node:test";
import { articleLiveUrl, buildHeroPrompt, selectMissingArticles } from "../scripts/image-pipeline-lib.mjs";
import { buildImageBackfillPlist } from "../scripts/image-launch-agent-lib.mjs";
import { easternDate } from "../scripts/newsroom-health.mjs";

test("article links always use the live CREN domain", () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
  assert.equal(
    articleLiveUrl("Columbus Adds New Apartments"),
    "https://columbusrealestatenews.com/blog/columbus-adds-new-apartments",
  );
});

test("selection prioritizes the newest article and clears the oldest backlog", () => {
  const rows = [
    { id: "middle", created_at: "2026-08-05T00:00:00Z" },
    { id: "newest", created_at: "2026-08-10T00:00:00Z" },
    { id: "oldest", created_at: "2026-08-01T00:00:00Z" },
  ];
  assert.deepEqual(selectMissingArticles(rows, 2).map((row) => row.id), ["newest", "oldest"]);
});

test("hero prompts enforce the shared editorial art direction", () => {
  const prompt = buildHeroPrompt({
    title: "Columbus Warehouse Breaks Ground",
    excerpt: "A new logistics project is underway.",
    area_slug: "rickenbacker",
    image_brief: {
      primary_request: 'Explain a warehouse reuse decision.',
      editorial_idea: 'Contrast the existing shell with the new use.',
      story_anchors: ['brick warehouse bay', 'reused loading area'],
    },
  });
  assert.match(prompt, /16:9 editorial news article hero/);
  assert.match(prompt, /clearly an illustration/);
  assert.match(prompt, /brick warehouse bay; reused loading area/);
  assert.match(prompt, /no readable text/);
  assert.match(prompt, /artist signatures, corner marks, dashed or dotted lines, parcel outlines/);
  assert.match(prompt, /handshakes, keys in a palm/);
});

test("launch agent includes primary and catch-up attempts", () => {
  const plist = buildImageBackfillPlist({
    frontendPath: "/project/frontend",
    nodePath: "/node/bin/node",
    codexBinPath: "/codex/bin",
  });
  assert.equal((plist.match(/<key>Hour<\/key>/g) ?? []).length, 3);
  assert.match(plist, /<integer>7<\/integer>/);
  assert.match(plist, /<integer>8<\/integer>/);
  assert.match(plist, /<integer>12<\/integer>/);
  assert.match(plist, /run-image-backfill\.mjs/);
});

test("daily health keys use the Columbus calendar date", () => {
  assert.equal(easternDate(new Date("2026-08-10T03:30:00Z")), "2026-08-09");
});
