export const WORKFLOW_ENABLE_FLAGS = ['CREN_EDITORIAL_PROOFS_ENABLED', 'CREN_OPERATIONS_ENABLED', 'CREN_CADENCE_ENABLED'];
export const WORKFLOW_KEEP_OFF_FLAGS = ['CREN_EDITORIAL_CORRECTIONS_ENABLED', 'CRM_SYNC_ENABLED',
  'AGENT_EXTERNAL_SENDS_ENABLED', 'AGENT_AUTO_SEND_LOW_RISK', 'CREN_ACQUISITION_INTAKE_ENABLED', 'NEXT_PUBLIC_CREN_ACQUISITION_INTAKE_ENABLED'];
export const WORKFLOW_REQUIRED_VALUES = ['DATABASE_URL', 'CRON_SECRET', 'RESEND_API_KEY', 'RESEND_RECEIVING_API_KEY',
  'RESEND_EDITORIAL_WEBHOOK_SECRET', 'CREN_EDITOR_REVIEW_EMAIL', 'CREN_EDITOR_REVIEW_DOMAIN'];

export function planWorkflowActivation(values) {
  if (WORKFLOW_KEEP_OFF_FLAGS.some(key => values[key] !== 'false')) throw new Error('PROTECTED_WORKFLOW_FLAGS_MUST_REMAIN_OFF');
  if (WORKFLOW_REQUIRED_VALUES.some(key => typeof values[key] !== 'string' || !values[key].trim())) throw new Error('WORKFLOW_CONFIGURATION_INCOMPLETE');
  if (values.CREN_EDITOR_REVIEW_EMAIL.trim().toLowerCase() !== 'ceo@digiwealth.io'
    || values.CREN_EDITOR_REVIEW_DOMAIN.trim().toLowerCase() !== 'review.columbusrealestatenews.com') throw new Error('CREN_OWNER_REVIEW_TARGET_MISMATCH');
  return { set: Object.fromEntries(WORKFLOW_ENABLE_FLAGS.map(key => [key, 'true'])),
    keepOff: [...WORKFLOW_KEEP_OFF_FLAGS], paidModelActivation: false, publicContentWrites: false,
    cadenceMeaning: 'Internal operational assignment reports, not executed reporting, events, newsletters or outreach.' };
}
