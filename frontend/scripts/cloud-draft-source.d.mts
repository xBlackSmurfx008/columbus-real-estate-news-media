export interface CloudDraftArtifact {
  commit: string;
  path: string;
  blobSha: string;
  sha256: string;
  article: Record<string, unknown>;
}
export interface CloudRunReceipt {
  schemaVersion: 'cren-cloud-run-v1'; routine: 'cre-news-newsroom'; date: string; completedAt: string;
  storyResult: 'ARTIFACTS_COMMITTED' | 'NO_QUALIFYING_STORY'; articlePaths: string[]; path: string; blobSha: string;
}

export function easternDate(now?: Date): string;
export function validateCloudRunReceipt(receipt: Record<string, unknown>, options: {
  today: string; now: Date; articlePaths: string[];
}): Omit<CloudRunReceipt, 'path' | 'blobSha'>;
export function readCloudDrafts(options?: {
  now?: Date;
  fetcher?: typeof fetch;
}): Promise<{ date: string; commit: string; artifacts: CloudDraftArtifact[]; runReceipt: CloudRunReceipt | null }>;
