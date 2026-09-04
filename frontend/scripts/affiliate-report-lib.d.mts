export type AffiliateGroupRow = {
  key: string;
  clicks: number;
  affiliateClicks: number;
};

export type AffiliatePerformance =
  | { available: false; reason: string }
  | {
      available: true;
      windowDays: number;
      columns: string[];
      totals: {
        clicks: number;
        affiliateClicks: number;
        allTimeClicks: number;
        excludedTestClicks: number;
      };
      byPartner: AffiliateGroupRow[];
      byPage: AffiliateGroupRow[];
      byArea: AffiliateGroupRow[];
      byIntent: AffiliateGroupRow[];
      byPlacement: AffiliateGroupRow[];
    };

export type AffiliateProgramStatusRow = {
  partnerSlug: string;
  programName: string | null;
  network: string | null;
  status: string;
  hasPartnerId: boolean;
  hasTrackingTemplate: boolean;
  notes: string | null;
};

export declare function affiliatePerformance(
  sql: unknown,
  options?: { windowDays?: number },
): Promise<AffiliatePerformance>;

export declare function affiliateProgramStatus(sql: unknown): Promise<AffiliateProgramStatusRow[]>;

export declare function formatAffiliateReport(
  result: AffiliatePerformance,
  programs?: AffiliateProgramStatusRow[],
): string;
