import { createHash } from 'node:crypto';

export const CREN_ROUTINE_IDENTITY = '[routine: cre-news-newsroom v2 cloud-handoff-only]';
export const CREN_HANDOFF_START = '<!-- CREN_CLOUD_HANDOFF_START -->';
export const CREN_HANDOFF_END = '<!-- CREN_CLOUD_HANDOFF_END -->';

export function buildCloudRoutineInstructions({ handoff, writing }) {
  if (!handoff?.trim() || !writing?.trim()) throw new Error('ROUTINE_POLICY_INPUT_REQUIRED');
  return [
    CREN_ROUTINE_IDENTITY,
    'These instructions replace every earlier CREN routine instruction. Do not use a legacy prefix, direct database workflow, or direct publication workflow.',
    'The cloud handoff policy defines this routine\'s authority. If the general writing policy describes a downstream fallback that the handoff does not authorize, follow the handoff and hold the story.',
    CREN_HANDOFF_START,
    handoff.trim(),
    writing.trim(),
    CREN_HANDOFF_END,
  ].join('\n\n');
}

export function routineInstructionHash(text) {
  return createHash('sha256').update(text).digest('hex');
}
