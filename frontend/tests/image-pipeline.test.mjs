import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { articleLiveUrl, buildHeroPrompt, normalizeIllustrationRequest, selectMissingArticles } from "../scripts/image-pipeline-lib.mjs";
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

test("AI image requests cannot conflict by asking for a documentary photo", () => {
  assert.equal(
    normalizeIllustrationRequest('A photorealistic editorial photo of a construction site'),
    'A clearly illustrative editorial illustration of a construction site',
  );
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

test("a hero URL that only resolves after a deploy is never attached to a live article", async () => {
  // Regression guard. In August 2026 the daily cloud routine ran
  // generate-placeholder-heroes.mjs with --allow-deploy-lag, which wrote
  // /images/heroes/<slug>.webp into image_url. The routine cannot deploy, so
  // four live articles pointed at 404s and fell back to one shared stock photo,
  // making distinct stories look like duplicates.
  const source = await readFile(
    new URL("../scripts/generate-placeholder-heroes.mjs", import.meta.url),
    "utf8",
  );

  // The DB write must be guarded by the deployNeeded check, and the guard must
  // come before the UPDATE.
  const guardIndex = source.indexOf("if (hosted.deployNeeded)");
  const updateIndex = source.indexOf("UPDATE articles");
  assert.ok(guardIndex > 0, "expected a deployNeeded guard before persisting a hero URL");
  assert.ok(updateIndex > guardIndex, "the deployNeeded guard must precede the UPDATE");
  assert.match(source, /NON_DURABLE_URL_NOT_PERSISTED/);

  // The staging command must never persist a live article or attach a temporary
  // placeholder after the insert.
  const publish = await readFile(
    new URL("../scripts/publish-article.mjs", import.meta.url),
    "utf8",
  );
  assert.match(publish, /\$\{id\}, \$\{slug\}, 'draft'/);
  assert.doesNotMatch(publish, /\$\{id\}, \$\{slug\}, 'live'/);
  assert.doesNotMatch(publish, /hostPlaceholderCard/);
});

test("image preparation is draft-only and stops at review", async () => {
  const [listSource, startSource, attachSource, cloudSource] = await Promise.all([
    readFile(new URL("../scripts/list-missing-images.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/record-image-start.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/attach-article-image.mjs", import.meta.url), "utf8"),
    readFile(new URL("../workflows/newsroom-images.ts", import.meta.url), "utf8"),
  ]);
  assert.match(listSource, /articles\.status = 'draft'/);
  assert.match(startSource, /status = 'draft'/);
  assert.match(attachSource, /status = 'draft'/);
  assert.match(attachSource, /status = 'READY_FOR_REVIEW'/);
  assert.doesNotMatch(cloudSource, /UPDATE articles SET[\s\S]{0,200}status = 'live'/);
  assert.doesNotMatch(cloudSource, /publishCandidate/);
});
