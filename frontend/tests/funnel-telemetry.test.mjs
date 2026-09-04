import assert from "node:assert/strict";
import test from "node:test";
import {
  CLIENT_FUNNEL_STAGES,
  FUNNELS,
  FUNNEL_STAGES,
  funnelForPath,
  funnelForPersona,
  isFunnelSlug,
  isFunnelStage,
  stageForLeadStatus,
} from "../scripts/funnel-lib.mjs";

test("the four revenue funnels are defined with page and persona", () => {
  assert.equal(FUNNELS.length, 4);
  const paths = FUNNELS.map((f) => f.path).sort();
  assert.deepEqual(paths, [
    "/invest/deploy-capital",
    "/rent/find-a-home",
    "/sell/investment-property",
    "/sell/your-home",
  ]);
});

test("the stage chain matches the owner plan, in order", () => {
  assert.deepEqual(FUNNEL_STAGES, [
    "funnel_view",
    "cta_click",
    "form_start",
    "form_submit",
    "contacted",
    "qualified",
    "opportunity",
    "closed",
  ]);
});

test("browsers may only report the first four stages", () => {
  for (const stage of CLIENT_FUNNEL_STAGES) assert.ok(FUNNEL_STAGES.includes(stage));
  for (const stage of ["contacted", "qualified", "opportunity", "closed"]) {
    assert.equal(CLIENT_FUNNEL_STAGES.includes(stage), false, `${stage} must be server-derived`);
  }
});

test("paths and personas resolve to funnels", () => {
  assert.equal(funnelForPath("/rent/find-a-home")?.slug, "renter");
  assert.equal(funnelForPath("/rent/find-a-home/")?.slug, "renter");
  assert.equal(funnelForPath("/sell/your-home?utm_source=x")?.slug, "fsbo_seller");
  assert.equal(funnelForPath("/blog/some-story"), null);
  assert.equal(funnelForPersona("capital_partner")?.path, "/invest/deploy-capital");
  assert.equal(funnelForPersona("directory_listing"), null);
});

test("lead statuses map onto the back half of the chain", () => {
  assert.equal(stageForLeadStatus("new"), null);
  assert.equal(stageForLeadStatus("contacted"), "contacted");
  assert.equal(stageForLeadStatus("qualified"), "qualified");
  assert.equal(stageForLeadStatus("opportunity"), "opportunity");
  assert.equal(stageForLeadStatus("won"), "closed");
  assert.equal(stageForLeadStatus("lost"), "closed");
  assert.equal(stageForLeadStatus("nonsense"), null);
});

test("guards reject unknown funnels and stages", () => {
  assert.equal(isFunnelSlug("renter"), true);
  assert.equal(isFunnelSlug("newsletter"), false);
  assert.equal(isFunnelStage("form_submit"), true);
  assert.equal(isFunnelStage("purchase"), false);
});
