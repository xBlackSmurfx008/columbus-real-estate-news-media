import assert from 'node:assert/strict';
import test from 'node:test';
import { planWorkflowActivation, WORKFLOW_KEEP_OFF_FLAGS, WORKFLOW_REQUIRED_VALUES } from '../scripts/workflow-activation-policy.mjs';
function valid() {
  return { ...Object.fromEntries(WORKFLOW_KEEP_OFF_FLAGS.map(key => [key, 'false'])),
    ...Object.fromEntries(WORKFLOW_REQUIRED_VALUES.map(key => [key, 'fixture-present'])),
    CREN_EDITOR_REVIEW_EMAIL: 'ceo@digiwealth.io', CREN_EDITOR_REVIEW_DOMAIN: 'review.columbusrealestatenews.com' };
}
test('reviewed workflow activation enables proofs and internal cadence only', () => {
  const plan = planWorkflowActivation(valid());
  assert.deepEqual(plan.set, { CREN_EDITORIAL_PROOFS_ENABLED: 'true', CREN_OPERATIONS_ENABLED: 'true', CREN_CADENCE_ENABLED: 'true' });
  assert.equal(plan.paidModelActivation, false);
  assert.equal(plan.publicContentWrites, false);
  assert.match(plan.cadenceMeaning, /not executed reporting/);
});
test('activation refuses paid revisions, outreach or acquisition enablement and missing protection flags', () => {
  for (const key of WORKFLOW_KEEP_OFF_FLAGS) for (const value of ['true', undefined, '']) {
    assert.throws(() => planWorkflowActivation({ ...valid(), [key]: value }), /PROTECTED_WORKFLOW_FLAGS/);
  }
});
test('proof workflow requires complete delivery configuration and the exact CREN owner target', () => {
  for (const key of WORKFLOW_REQUIRED_VALUES) assert.throws(() => planWorkflowActivation({ ...valid(), [key]: '' }), /CONFIGURATION_INCOMPLETE/);
  assert.throws(() => planWorkflowActivation({ ...valid(), CREN_EDITOR_REVIEW_EMAIL: 'other@example.test' }), /TARGET_MISMATCH/);
});
