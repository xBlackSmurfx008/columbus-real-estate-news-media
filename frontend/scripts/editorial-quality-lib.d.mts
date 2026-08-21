export interface EditorialQualityReport {
  passed: boolean;
  score: number;
  possible: number;
  failedCodes: string[];
  humanReviewRequired: boolean;
  checks: Array<{
    id: string;
    passed: boolean;
    message: string;
    details?: unknown;
  }>;
}

export function evaluateArticle(article: Record<string, unknown>): EditorialQualityReport;

export function formatQualityReport(report: EditorialQualityReport): string;

