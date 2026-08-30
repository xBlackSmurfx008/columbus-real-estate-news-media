import assert from "node:assert/strict";
import test from "node:test";
import { getAgentCapabilities, hasAgentCapability } from "../src/agent/policy/capabilities.ts";

test("owner has all agent capabilities", () => {
  assert.equal(hasAgentCapability("owner", "research:prepare"), true);
  assert.equal(hasAgentCapability("owner", "billing:manage"), true);
  assert.equal(hasAgentCapability("owner", "sequence:execute"), true);
});

test("sales can prepare research but cannot manage billing", () => {
  assert.equal(hasAgentCapability("sales", "email:approve"), true);
  assert.equal(hasAgentCapability("sales", "billing:manage"), false);
  assert.equal(hasAgentCapability("sales", "research:prepare"), true);
});

test("unknown roles have no agent capabilities", () => {
  assert.deepEqual(getAgentCapabilities("unknown"), []);
  assert.equal(hasAgentCapability("unknown", "dashboard:read"), false);
});
