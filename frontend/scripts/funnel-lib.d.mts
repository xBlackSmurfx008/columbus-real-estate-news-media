export type FunnelStage =
  | "funnel_view"
  | "cta_click"
  | "form_start"
  | "form_submit"
  | "contacted"
  | "qualified"
  | "opportunity"
  | "closed";

export type FunnelSlug = "fsbo_seller" | "investor_seller" | "capital_partner" | "renter";

export type FunnelDefinition = {
  slug: FunnelSlug;
  label: string;
  path: string;
  persona: string;
};

export declare const FUNNEL_STAGES: FunnelStage[];
export declare const CLIENT_FUNNEL_STAGES: FunnelStage[];
export declare const FUNNELS: FunnelDefinition[];
export declare const FUNNEL_SLUGS: FunnelSlug[];
export declare const FUNNEL_PATHS: string[];
export declare const LEAD_STATUSES: string[];
export declare const QUALIFIED_STATUSES: string[];

export declare function isFunnelSlug(value: unknown): value is FunnelSlug;
export declare function isFunnelStage(value: unknown): value is FunnelStage;
export declare function funnelBySlug(slug: string): FunnelDefinition | null;
export declare function funnelForPath(path: string): FunnelDefinition | null;
export declare function funnelForPersona(persona: string): FunnelDefinition | null;
export declare function stageForLeadStatus(status: string): FunnelStage | null;
