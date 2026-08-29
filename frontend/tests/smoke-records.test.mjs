import assert from "node:assert/strict";
import test from "node:test";
import {
  nonSmokeWhere,
  smokeCountQuery,
  smokeDeleteQuery,
  smokeTableDefinition,
  smokeWhere,
} from "../scripts/smoke-records-lib.mjs";

test("smoke record filters cover every public audience table", () => {
  for (const table of ["contacts", "subscribers", "leads", "members"]) {
    assert.match(smokeWhere(table), /codex-smoke/);
    assert.match(nonSmokeWhere(table), /NOT LIKE/);
    assert.match(smokeCountQuery(table), new RegExp(`FROM ${table}`));
    assert.match(smokeDeleteQuery(table), new RegExp(`DELETE FROM ${table}`));
  }
});

test("smoke record table names are whitelisted", () => {
  assert.equal(smokeTableDefinition("leads").marker, "source");
  assert.equal(smokeTableDefinition("members").marker, "interests");
  assert.throws(() => smokeTableDefinition("articles"), /Unsupported smoke table/);
});
