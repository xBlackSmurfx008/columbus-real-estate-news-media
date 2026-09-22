function ageHours(timestamp, now) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const age = (now.getTime() - new Date(timestamp).getTime()) / 3_600_000;
  return !Number.isFinite(age) || age < -5 / 60 ? Infinity : Math.max(0, age);
}

const threshold = (value, fallback) => Number.isFinite(value) && value > 0 && value <= 24 * 365 ? value : fallback;
const roundedAge = value => Number.isFinite(value) ? Number(value.toFixed(1)) : null;

export function assessNewsroomAutomationHealth(snapshot, {
  now = new Date(),
  maxRunAgeHours = 36,
  maxDraftAgeHours = 24,
  maxPublicationAgeHours = 72,
  maxStageAgeHours = 2.5,
} = {}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('INVALID_HEALTH_TIME');
  maxRunAgeHours = threshold(maxRunAgeHours, 36);
  maxDraftAgeHours = threshold(maxDraftAgeHours, 24);
  maxPublicationAgeHours = threshold(maxPublicationAgeHours, 72);
  maxStageAgeHours = threshold(maxStageAgeHours, 2.5);
  const reasons = [];
  const lastRunAgeHours = ageHours(snapshot.lastCompletedRunAt, now);
  const oldestDraftAgeHours = snapshot.oldestDraftAt ? ageHours(snapshot.oldestDraftAt, now) : 0;
  const lastPublicationAgeHours = ageHours(snapshot.lastPublicationAt, now);

  if (lastRunAgeHours > maxRunAgeHours) reasons.push('MISSED_NEWSROOM_RUN');
  if (snapshot.runningRuns > 0 && ageHours(snapshot.oldestRunningRunAt, now) > maxRunAgeHours) {
    reasons.push('STUCK_NEWSROOM_RUN');
  }
  if (snapshot.failedRunsSinceLastCompletion > 0) reasons.push('FAILED_NEWSROOM_RUN');
  if ((snapshot.actionableDraftCount ?? snapshot.draftCount) > 0 && oldestDraftAgeHours > maxDraftAgeHours) reasons.push('STUCK_DRAFT');
  if (lastPublicationAgeHours > maxPublicationAgeHours) reasons.push('PUBLICATION_STALE');

  const stages = snapshot.stages ?? {};
  const notices = [];
  const overdue = stage => stage?.pending > 0 && ageHours(stage.oldestPendingAt, now) > maxStageAgeHours;
  if (stages.imports?.blocked > 0) reasons.push('CLOUD_IMPORT_BLOCKED');
  if (stages.imports?.failed > 0) reasons.push('CLOUD_IMPORT_FAILED');
  if (overdue(stages.imports)) reasons.push('CLOUD_IMPORT_STUCK');
  if (stages.imports?.enabled && ageHours(stages.imports.lastAttemptAt, now) > maxStageAgeHours) reasons.push('CLOUD_IMPORT_MISSED');
  if (stages.images?.blocked > 0) reasons.push('IMAGE_BLOCKED');
  if (stages.images?.failed > 0) reasons.push('IMAGE_FAILED');
  if (stages.images?.expiredLeases > 0 || overdue(stages.images)) reasons.push('IMAGE_STUCK');
  if (overdue(stages.proofs)) reasons.push('PROOF_DELIVERY_STUCK');
  if (stages.proofs?.sending > 0 && ageHours(stages.proofs.oldestSendingAt, now) > 23) reasons.push('PROOF_DELIVERY_RECONCILIATION_REQUIRED');
  if (stages.proofs?.awaitingOwner > 0) notices.push('AWAITING_OWNER_REVIEW');
  if (stages.corrections?.manualRequired > 0) notices.push('MANUAL_CORRECTION_REQUIRED');
  if (stages.corrections?.blocked > 0) reasons.push('CORRECTION_BLOCKED');
  if (stages.corrections?.expiredLeases > 0 || overdue(stages.corrections)) reasons.push('CORRECTION_STUCK');
  if (stages.publication?.blocked > 0) reasons.push('PUBLICATION_BLOCKED');
  if (stages.publication?.bookkeepingFailures > 0) reasons.push('PUBLICATION_BOOKKEEPING_FAILED');
  if (overdue(stages.publication)) reasons.push('PUBLICATION_PROCESSING_STUCK');

  return {
    ok: reasons.length === 0,
    reasons,
    notices,
    stages,
    metrics: {
      lastRunAgeHours: roundedAge(lastRunAgeHours),
      oldestDraftAgeHours: roundedAge(oldestDraftAgeHours),
      lastPublicationAgeHours: roundedAge(lastPublicationAgeHours),
      lastPublicationAt: snapshot.lastPublicationAt ?? null,
      publicationClock: snapshot.lastPublicationAt ? 'AUDITED_PUBLICATION' : 'UNKNOWN',
      draftCount: snapshot.draftCount,
      actionableDraftCount: snapshot.actionableDraftCount ?? snapshot.draftCount,
      runningRuns: snapshot.runningRuns,
      failedRunsSinceLastCompletion: snapshot.failedRunsSinceLastCompletion,
    },
  };
}
