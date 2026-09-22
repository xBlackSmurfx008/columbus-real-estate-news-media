export interface CloudDraftArtifact {
  commit: string;
  path: string;
  blobSha: string;
  sha256: string;
  article: Record<string, unknown>;
}

export function easternDate(now?: Date): string;
export function readCloudDrafts(options?: {
  now?: Date;
  fetcher?: typeof fetch;
}): Promise<{ date: string; commit: string; artifacts: CloudDraftArtifact[] }>;
