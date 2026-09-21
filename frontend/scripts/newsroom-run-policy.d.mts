export interface NewsroomHealthSnapshot {
  lastCompletedRunAt: string | Date | null;
  oldestRunningRunAt: string | Date | null;
  runningRuns: number;
  failedRunsSinceLastCompletion: number;
  draftCount: number;
  oldestDraftAt: string | Date | null;
  lastPublicationAt: string | Date | null;
}

export interface NewsroomHealthOptions {
  now?: Date;
  maxRunAgeHours?: number;
  maxDraftAgeHours?: number;
  maxPublicationAgeHours?: number;
}

export interface NewsroomHealthReport {
  ok: boolean;
  reasons: string[];
  metrics: {
    lastRunAgeHours: number | null;
    oldestDraftAgeHours: number;
    lastPublicationAgeHours: number | null;
    draftCount: number;
    runningRuns: number;
    failedRunsSinceLastCompletion: number;
  };
}

export function assessNewsroomAutomationHealth(
  snapshot: NewsroomHealthSnapshot,
  options?: NewsroomHealthOptions,
): NewsroomHealthReport;
