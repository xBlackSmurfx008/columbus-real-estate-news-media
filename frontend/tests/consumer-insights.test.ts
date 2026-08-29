import assert from "node:assert/strict";
import test from "node:test";
import {
  BUYER_PRICE_BANDS,
  PROOF_COHORT_AREA_SLUGS,
  PROOF_COHORT_CONTENT_PACKAGES,
  RENTER_DUE_DILIGENCE_SECTIONS,
  SPONSOR_SAFE_SERVICE_RULES,
  getAreaRealityCheck,
  getAreaReleasePolicy,
  getProofCohortContentPackage,
  getSearchRecoveryIntent,
} from "../lib/consumer-insights.ts";
import {
  ADVERTISING_PACKAGE_OPTIONS,
  DIRECTORY_CATEGORY_RULEBOOK,
  DIRECTORY_LISTING_FIELD_GROUPS,
  DIRECTORY_POLICIES,
  DIRECTORY_VERIFICATION_LABELS,
  FIRST_DIRECTORY_PILOT_PACKAGE,
  SPONSOR_PACKAGE_DEFINITIONS,
  SPONSOR_REPORTING_EXAMPLE,
} from "../lib/directory-sponsorship.ts";
import { franklinSeedsToAreas } from "../lib/franklin-areas.ts";

const areas = franklinSeedsToAreas();
const bySlug = new Map(areas.map((area) => [area.slug, area]));

test("proof cohort area reality checks are attached to real area hubs", () => {
  for (const slug of PROOF_COHORT_AREA_SLUGS) {
    const area = bySlug.get(slug);
    assert.ok(area, `${slug} exists`);

    const realityCheck = getAreaRealityCheck(area);
    assert.ok(realityCheck, `${slug} has a reality check`);
    assert.equal(realityCheck.slug, slug);
    assert.ok(realityCheck.primaryQuestion.length > 20, `${slug} has a real question`);
    assert.ok(realityCheck.followPromise.length > 20, `${slug} has a follow promise`);
    assert.ok(realityCheck.whatToVerify.length >= 5, `${slug} has verification prompts`);
    assert.ok(realityCheck.nearbySubstitutes.length >= 3, `${slug} has substitutes`);

    const contentPackage = getProofCohortContentPackage(area);
    assert.ok(contentPackage, `${slug} has a content package`);
    assert.equal(contentPackage.areaSlug, slug);
    assert.ok(contentPackage.leadPieces.length >= 5, `${slug} has a full content package`);
    assert.ok(contentPackage.evidenceRequirements.length >= 5, `${slug} has evidence requirements`);
  }
});

test("area release policy gates sitemap and indexability by tier", () => {
  const proof = bySlug.get("dublin");
  const tierOne = bySlug.get("upper-arlington");
  const tierTwo = bySlug.get("worthington");
  const tierThree = bySlug.get("reese");

  assert.ok(proof);
  assert.ok(tierOne);
  assert.ok(tierTwo);
  assert.ok(tierThree);

  assert.equal(getAreaReleasePolicy(proof).tier, "proof-cohort");
  assert.equal(getAreaReleasePolicy(proof).indexable, true);
  assert.equal(getAreaReleasePolicy(tierOne).tier, "tier-1");
  assert.equal(getAreaReleasePolicy(tierOne).indexable, true);
  assert.equal(getAreaReleasePolicy(tierTwo).tier, "tier-2");
  assert.equal(getAreaReleasePolicy(tierTwo).indexable, true);
  assert.equal(getAreaReleasePolicy(tierThree).tier, "tier-3");
  assert.equal(getAreaReleasePolicy(tierThree).indexable, false);
});

test("renter due-diligence checklist has a complete reusable structure", () => {
  const ids = new Set<string>();
  let itemCount = 0;

  for (const section of RENTER_DUE_DILIGENCE_SECTIONS) {
    assert.ok(section.id);
    assert.ok(!ids.has(section.id), `${section.id} is unique`);
    ids.add(section.id);
    assert.ok(section.title.length > 5);
    assert.ok(section.description.length > 10);
    assert.ok(section.items.length >= 3, `${section.id} has enough checks`);
    itemCount += section.items.length;
  }

  assert.equal(RENTER_DUE_DILIGENCE_SECTIONS.length, 6);
  assert.ok(itemCount >= 18);
});

test("zero-result search recovery maps common consumer intents", () => {
  assert.equal(getSearchRecoveryIntent("OSU apartment lease fees"), "rent");
  assert.equal(getSearchRecoveryIntent("can I afford a house in Dublin"), "buy");
  assert.equal(getSearchRecoveryIntent("duplex cash flow near Franklinton"), "invest");
  assert.equal(getSearchRecoveryIntent("free kids events this weekend"), "local-life");
  assert.equal(getSearchRecoveryIntent("German Village alternatives"), "area");
});

test("buyer price-band reality cards are complete and linked", () => {
  assert.equal(BUYER_PRICE_BANDS.length, 5);
  for (const band of BUYER_PRICE_BANDS) {
    assert.ok(band.id);
    assert.ok(band.label.includes("$"));
    assert.ok(band.summary.length > 80);
    assert.ok(band.likelyTradeoffs.length >= 4, `${band.id} tradeoffs`);
    assert.ok(band.verifyBeforeTouring.length >= 5, `${band.id} verification`);
    assert.ok(band.areasToCompare.length >= 4, `${band.id} areas`);
    assert.ok(band.nextStep.href.startsWith("/"), `${band.id} next step`);
  }
});

test("proof cohort content packages exist for every proof cohort slug", () => {
  assert.deepEqual(
    Object.keys(PROOF_COHORT_CONTENT_PACKAGES).sort(),
    [...PROOF_COHORT_AREA_SLUGS].sort(),
  );
});

test("sponsor-safe service rules cover disclosure, proof, fair housing, and disputes", () => {
  assert.ok(SPONSOR_SAFE_SERVICE_RULES.length >= 8);
  const searchable = SPONSOR_SAFE_SERVICE_RULES.map((rule) => `${rule.title} ${rule.standard} ${rule.check}`).join(" ").toLowerCase();
  for (const term of ["paid", "editorial", "claims", "housing", "reviews", "lead", "dispute", "licensing"]) {
    assert.ok(searchable.includes(term), `rules mention ${term}`);
  }
});

test("directory sponsorship rulebook is ready for a sponsor-safe pilot", () => {
  assert.ok(DIRECTORY_CATEGORY_RULEBOOK.length >= 5);
  assert.ok(DIRECTORY_LISTING_FIELD_GROUPS.length >= 4);
  assert.ok(DIRECTORY_VERIFICATION_LABELS.length >= 4);
  assert.ok(SPONSOR_PACKAGE_DEFINITIONS.length >= 6);
  assert.equal(FIRST_DIRECTORY_PILOT_PACKAGE.name, "OSU Move-In Services Pilot");

  const searchable = [
    ...DIRECTORY_CATEGORY_RULEBOOK.map((rule) => [
      rule.category,
      rule.pilotPriority,
      rule.sponsorFit,
      rule.requiredProof.join(" "),
      rule.allowedClaims.join(" "),
      rule.blockedClaims.join(" "),
      rule.reviewCadence,
    ].join(" ")),
    ...DIRECTORY_LISTING_FIELD_GROUPS.map((group) => `${group.group} ${group.fields.map((field) => field.label).join(" ")}`),
    ...DIRECTORY_POLICIES.map((policy) => `${policy.title} ${policy.rules.join(" ")}`),
    ...SPONSOR_PACKAGE_DEFINITIONS.map((pkg) => `${pkg.name} ${pkg.price} ${pkg.term} ${pkg.deliverables.join(" ")} ${pkg.labels.join(" ")} ${pkg.reporting.join(" ")} ${pkg.boundaries.join(" ")}`),
    FIRST_DIRECTORY_PILOT_PACKAGE.deliverables.join(" "),
    SPONSOR_REPORTING_EXAMPLE.metrics.join(" "),
    SPONSOR_REPORTING_EXAMPLE.renewalRecommendation,
  ].join(" ").toLowerCase();

  for (const term of ["category", "claim", "sponsored", "dispute", "removal", "reporting", "renewal", "editorial"]) {
    assert.ok(searchable.includes(term), `rulebook mentions ${term}`);
  }

  for (const label of DIRECTORY_VERIFICATION_LABELS) {
    assert.match(label.doesNotMean.toLowerCase(), /endorse|recommend|guarantee|coverage|verified/);
  }

  for (const pkg of SPONSOR_PACKAGE_DEFINITIONS) {
    const packageCopy = `${pkg.name} ${pkg.deliverables.join(" ")} ${pkg.boundaries.join(" ")}`.toLowerCase();
    assert.ok(!packageCopy.includes("sponsored story"), `${pkg.name} does not sell sponsored stories`);
    assert.ok(!packageCopy.includes("preferred provider"), `${pkg.name} does not imply preferred-provider status`);
  }

  assert.ok(ADVERTISING_PACKAGE_OPTIONS.includes("Category Service Guide Pilot"));
});
