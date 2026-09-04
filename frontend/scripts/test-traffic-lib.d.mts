export declare const SMOKE_SOURCE_PREFIX: string;
export declare const SMOKE_EMAIL_DOMAIN: string;
export declare const LEGACY_SMOKE_SOURCE_PREFIX: string;
export declare const LEGACY_SMOKE_EMAIL_PREFIX: string;

export declare const TEST_SOURCE_PATTERN: string;
export declare const TEST_EMAIL_PATTERN: string;
export declare const TEST_BODY_PATTERN: string;

export declare function isTestSource(value: unknown): boolean;
export declare function isTestEmail(value: unknown): boolean;
export declare function isTestBody(value: unknown): boolean;

export declare function isTestTraffic(input?: {
  source?: unknown;
  email?: unknown;
  body?: unknown;
  flagged?: boolean;
}): boolean;

export type TestTrafficTableDefinition = {
  label: string;
  sourceColumn?: string;
  emailColumn?: string;
  bodyColumn?: string;
  flagColumn?: string;
};

export declare const TEST_TRAFFIC_TABLES: Record<string, TestTrafficTableDefinition>;
export declare function testTrafficTableDefinition(table: string): TestTrafficTableDefinition;
export declare function testTrafficSql(table: string, availableColumns?: string[] | null): string;
export declare function realTrafficSql(table: string, availableColumns?: string[] | null): string;
export declare function tableColumns(sql: unknown, table: string): Promise<string[]>;
export declare function resolveTestTrafficPredicates(
  sql: unknown,
  table: string,
): Promise<{ table: string; columns: string[]; testWhere: string; realWhere: string }>;
