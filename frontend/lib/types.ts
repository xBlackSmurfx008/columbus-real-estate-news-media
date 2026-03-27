export type AreaKind = "region" | "city" | "neighborhood" | "cdp" | "corridor";

export type Area = {
  slug: string;
  name: string;
  description: string;
  populationSignal: string;
  kind?: AreaKind;
  multiCountyNote?: string;
};

export type Topic = {
  slug: string;
  name: string;
  description: string;
};

export type ContentItem = {
  slug: string;
  title: string;
  areaSlug: string;
  topicSlug: string;
  format: "Article" | "Video" | "Interview" | "Case Study" | "Data Brief";
  excerpt: string;
  date: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  areaSlug: string;
  topicSlug: string;
  format: "Article" | "Data Brief";
  excerpt: string;
  date: string;
  readTimeMinutes: number;
  introHook: string;
  whatChanged: string[];
  whatItMeans: {
    renters: string;
    buyers: string;
    sellers: string;
  };
  bestNeighborhoods: string[];
  actionChecklist: string[];
  sourcesAndMethodology: string[];
  cta: {
    label: string;
    href: string;
  };
  internalLinks: Array<{
    label: string;
    href: string;
  }>;
};
