import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getAreaGuide, GUIDE_IMAGES } from "../lib/area-guides.ts";
import { franklinSeedsToAreas } from "../lib/franklin-areas.ts";

test("every declared area has complete cards without repeated decorative photography", () => {
  const areas = franklinSeedsToAreas();
  assert.equal(areas.length, 88);
  assert.ok(areas.some((area) => area.slug === "near-east-side"));

  for (const area of areas) {
    const guide = getAreaGuide(area);
    assert.equal(guide.discoveryCards.length, 4, `${area.slug} discovery cards`);
    assert.equal(guide.housingCards.length, 4, `${area.slug} housing cards`);
    assert.equal(guide.serviceCards.length, 3, `${area.slug} service cards`);
    assert.ok(guide.dailyLifeAnswer.includes(area.name), `${area.slug} daily-life answer`);
    assert.equal("representativeImage" in guide, false, `${area.slug} has no invented area hero`);
    for (const card of [...guide.discoveryCards, ...guide.housingCards, ...guide.serviceCards]) {
      assert.ok(card.title.includes(area.name), `${area.slug} card title must be area-specific`);
      assert.equal(card.image, undefined, `${area.slug} has no shared card image`);
      assert.equal(card.imageAlt, undefined, `${area.slug} has no orphan image description`);
      assert.ok(card.description.length > 0);
      assert.ok(card.href.startsWith(card.external ? "https://" : "/"));
    }
    assert.equal(guide.housingCards.find((card) => card.eyebrow === "Sell")?.href,
      `/sell/your-home?area=${encodeURIComponent(area.name)}`);
  }
});

test("every generated guide image is present in public assets", () => {
  for (const image of Object.values(GUIDE_IMAGES)) {
    assert.ok(existsSync(join(process.cwd(), "public", image.replace(/^\/images\//, "images/"))), image);
  }
});
