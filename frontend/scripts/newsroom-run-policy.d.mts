export interface NewsroomStageHealth {
  pending: number;
  blocked?: number;
  failed?: number;
  expiredLeases?: number;
  enabled?: boolean;
  lastAttemptAt?: string | null;
  lastStatus?: string | null;
  oldestPendingAt?: string | null;
  sending?: number;
  oldestSendingAt?: string | null;
  awaitingOwner?: number;
  readyForProof?: number;
  missingJobs?: number;
  manualRequired?: number;
  bookkeepingFailures?: number;
  problems?: Array<{ articleId?: string; path?: string; code: string }>;
}

export interface NewsroomHealthSnapshot {
  lastCompletedRunAt: string | Date | null;
  oldestRunningRunAt: string | Date | null;
  runningRuns: number;
  failedRunsSinceLastCompletion: number;
  draftCount: number;
  actionableDraftCount?: number;
  oldestDraftAt: string | Date | null;
  lastPublicationAt: string | Date | null;
  stages?: Record<string, NewsroomStageHealth>;
}

export interface NewsroomHealthOptions {
  now?: Date;
  maxRunAgeHours?: number;
  maxDraftAgeHours?: number;
  maxPublicationAgeHours?: number;
  maxStageAgeHours?: number;
}

export interface NewsroomHealthReport {
  ok: boolean;
  reasons: string[];
  notices: string[];
  stages: Record<string, NewsroomStageHealth>;
  metrics: {
    lastRunAgeHours: number | null;
    oldestDraftAgeHours: number | null;
    lastPublicationAgeHours: number | null;
    lastPublicationAt: string | Date | null;
    publicationClock: 'AUDITED_PUBLICATION' | 'UNKNOWN';
    draftCount: number;
    actionableDraftCount: number;
    runningRuns: number;
    failedRunsSinceLastCompletion: number;
  };
}

export function assessNewsroomAutomationHealth(
  snapshot: NewsroomHealthSnapshot,
  options?: NewsroomHealthOptions,
): NewsroomHealthReport;
