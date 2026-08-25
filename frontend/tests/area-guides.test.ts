import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getAreaGuide, GUIDE_IMAGES } from "../lib/area-guides.ts";
import { franklinSeedsToAreas } from "../lib/franklin-areas.ts";

test("every declared area has complete discovery, housing, service, and image cards", () => {
  const areas = franklinSeedsToAreas();
  assert.equal(areas.length, 86);

  for (const area of areas) {
    const guide = getAreaGuide(area);
    assert.equal(guide.discoveryCards.length, 4, `${area.slug} discovery cards`);
    assert.equal(guide.housingCards.length, 4, `${area.slug} housing cards`);
    assert.equal(guide.serviceCards.length, 3, `${area.slug} service cards`);
    assert.ok(guide.dailyLifeAnswer.includes(area.name), `${area.slug} daily-life answer`);
    assert.ok(guide.representativeImage.startsWith("/images/guides/"), `${area.slug} representative image`);
    for (const card of [...guide.discoveryCards, ...guide.housingCards, ...guide.serviceCards]) {
      assert.ok(card.title.includes(area.name), `${area.slug} card title must be area-specific`);
      assert.ok(card.image.startsWith("/images/guides/"), `${area.slug} card image`);
    }
  }
});

test("every generated guide image is present in public assets", () => {
  for (const image of Object.values(GUIDE_IMAGES)) {
    assert.ok(existsSync(join(process.cwd(), "public", image.replace(/^\/images\//, "images/"))), image);
  }
});
