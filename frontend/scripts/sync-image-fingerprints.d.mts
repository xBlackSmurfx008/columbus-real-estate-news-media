import type { EditorialSql } from '../lib/editorial-email-review';
type Issue = { articleId?: string; reason: string };
export function fingerprintSyncOptions(args: string[]): { apply: boolean };
export function syncImageFingerprints(sql: EditorialSql, options?: {
  apply?: boolean;
  fingerprint?: (url: string) => Promise<{ sha256: string; perceptualHash: string } | null>;
}): Promise<{
  ok: boolean; mode: string; scanned: number; synced?: number; wouldSync?: number;
  duplicates: Array<{ articleId: string; duplicateOf: string; kind: string; distance: number }>;
  invalid: Issue[]; cacheIssues: Issue[];
}>;
