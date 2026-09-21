function ageHours(timestamp, now) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - new Date(timestamp).getTime()) / 3_600_000);
}

export function assessNewsroomAutomationHealth(snapshot, {
  now = new Date(),
  maxRunAgeHours = 36,
  maxDraftAgeHours = 24,
  maxPublicationAgeHours = 72,
} = {}) {
  const reasons = [];
  const lastRunAgeHours = ageHours(snapshot.lastCompletedRunAt, now);
  const oldestDraftAgeHours = snapshot.oldestDraftAt ? ageHours(snapshot.oldestDraftAt, now) : 0;
  const lastPublicationAgeHours = ageHours(snapshot.lastPublicationAt, now);

  if (lastRunAgeHours > maxRunAgeHours) reasons.push('MISSED_NEWSROOM_RUN');
  if (snapshot.runningRuns > 0 && ageHours(snapshot.oldestRunningRunAt, now) > maxRunAgeHours) {
    reasons.push('STUCK_NEWSROOM_RUN');
  }
  if (snapshot.failedRunsSinceLastCompletion > 0) reasons.push('FAILED_NEWSROOM_RUN');
  if (snapshot.draftCount > 0 && oldestDraftAgeHours > maxDraftAgeHours) reasons.push('STUCK_DRAFT');
  if (lastPublicationAgeHours > maxPublicationAgeHours) reasons.push('PUBLICATION_STALE');

  return {
    ok: reasons.length === 0,
    reasons,
    metrics: {
      lastRunAgeHours: Number.isFinite(lastRunAgeHours) ? Number(lastRunAgeHours.toFixed(1)) : null,
      oldestDraftAgeHours: Number(oldestDraftAgeHours.toFixed(1)),
      lastPublicationAgeHours: Number.isFinite(lastPublicationAgeHours) ? Number(lastPublicationAgeHours.toFixed(1)) : null,
      draftCount: snapshot.draftCount,
      runningRuns: snapshot.runningRuns,
      failedRunsSinceLastCompletion: snapshot.failedRunsSinceLastCompletion,
    },
  };
}
