import type { EditorialSql } from '../lib/editorial-email-review';
export const cloudImportSchema: string[];
export type CloudDraftArtifact = { path: string; commit: string; blobSha: string; sha256: string; article: Record<string, unknown> };
export type CloudDraftBatch = { date: string; commit: string; artifacts: CloudDraftArtifact[] };
export function titlesDuplicate(a: string,b: string): boolean;
export function prepareCloudDraft(artifact: CloudDraftArtifact,date: string,now?: Date): { article: Record<string,unknown>; report: unknown; id: string; slug: string; imageMode: string };
export function stageCloudDraft(sql: EditorialSql,artifact: CloudDraftArtifact,options: {date:string;now?:Date;apply?:boolean}): Promise<Record<string,unknown>>;
export function runCloudImport(sql: EditorialSql,source:()=>Promise<CloudDraftBatch>,options?:{apply?:boolean;now?:Date}):Promise<{ok:boolean;status:string;commit:string;date:string;results:Record<string,unknown>[];published:number}>;
