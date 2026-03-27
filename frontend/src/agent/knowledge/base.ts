import { knowledgeStore } from "@/src/agent/store";
import type { KnowledgeEntry, PolicyConfig } from "@/src/agent/types";
import { existsSync, readFileSync } from "node:fs";

const plansRoot = process.env.AGENT_PLANS_ROOT || "../.cursor/plans";
const planKnowledgeFiles = [
  "media_kit_template_v1.md",
  "advertiser_pricing_guide_v1.md",
  "rate_card_launch_and_standard_v1.md",
  "advertiser_production_menu_v1.md",
  "outreach_scripts_v1.md",
  "advertiser_outreach_pricing_plan_3cf4aa02.plan.md",
];

const knowledgeSeed: KnowledgeEntry[] = [
  {
    id: "k_media_kit_v1",
    topic: "media_kit",
    content:
      "ColumbusREMedia offers Starter Visibility, Local Growth, and Authority Spotlight packages with site, newsletter, and sponsored content options.",
    effectiveDate: "2026-03-19",
    sourceDoc: ".cursor/plans/media_kit_template_v1.md",
    approvedBy: "founder",
    tags: ["media-kit", "packages"],
  },
  {
    id: "k_pricing_v1",
    topic: "pricing",
    content:
      "Launch pricing: Starter $500/mo, Local Growth $1250/mo, Authority Spotlight $2950/mo. Standard pricing applies after launch period.",
    effectiveDate: "2026-03-19",
    sourceDoc: ".cursor/plans/advertiser_pricing_guide_v1.md",
    approvedBy: "founder",
    tags: ["pricing", "launch", "standard"],
  },
  {
    id: "k_production_v1",
    topic: "production",
    content:
      "Spotlight video options: Lite $995, Standard $1950, Premium $4250. Creative add-ons available for static, animated, and sponsored content.",
    effectiveDate: "2026-03-19",
    sourceDoc: ".cursor/plans/advertiser_production_menu_v1.md",
    approvedBy: "founder",
    tags: ["video", "creative", "production"],
  },
  {
    id: "k_onboarding_v1",
    topic: "onboarding",
    content:
      "Advertiser onboarding includes intake form, asset collection, creative timeline, launch date confirmation, and reporting setup.",
    effectiveDate: "2026-03-19",
    sourceDoc: ".cursor/plans/advertiser_outreach_pricing_plan_3cf4aa02.plan.md",
    approvedBy: "founder",
    tags: ["onboarding", "workflow"],
  },
];

export const policyConfig: PolicyConfig = {
  maxDiscountPercent: 10,
  allowExclusivityOnlyForTopPackage: true,
  blockedContractLanguage: [
    "guaranteed ROI",
    "guaranteed lead volume",
    "perpetual exclusivity",
    "legally binding commitment outside IO",
  ],
  highRiskKeywords: [
    "discount",
    "contract",
    "legal",
    "exclusive",
    "complaint",
    "refund",
    "breach",
  ],
};

export function initializeKnowledgeBase(): void {
  if (knowledgeStore.size > 0) return;
  knowledgeSeed.forEach((entry) => knowledgeStore.set(entry.id, entry));
  const plansEntries = loadKnowledgeFromPlanFiles();
  plansEntries.forEach((entry) => knowledgeStore.set(entry.id, entry));
}

export function getKnowledgeByTopic(topic: string): KnowledgeEntry[] {
  const now = new Date();
  return [...knowledgeStore.values()].filter((entry) => {
    if (entry.topic !== topic) return false;
    if (entry.expiresAt && new Date(entry.expiresAt) < now) return false;
    return true;
  });
}

export function searchKnowledge(query: string): KnowledgeEntry[] {
  const q = query.toLowerCase();
  return [...knowledgeStore.values()].filter((entry) => {
    return (
      entry.topic.toLowerCase().includes(q) ||
      entry.content.toLowerCase().includes(q) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
}

export function getKnowledgeSnapshot(): KnowledgeEntry[] {
  return [...knowledgeStore.values()];
}

function resolveTopicFromFile(fileName: string): string {
  if (fileName.includes("pricing") || fileName.includes("rate_card")) return "pricing";
  if (fileName.includes("media_kit")) return "media_kit";
  if (fileName.includes("production")) return "production";
  if (fileName.includes("outreach")) return "outreach";
  return "general_info";
}

function sanitizeContent(content: string): string {
  return content.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function loadKnowledgeFromPlanFiles(): KnowledgeEntry[] {
  const loaded: KnowledgeEntry[] = [];
  for (const file of planKnowledgeFiles) {
    const fullPath = `${plansRoot}/${file}`;
    if (!existsSync(fullPath)) continue;
    const raw = readFileSync(fullPath, "utf8");
    const content = sanitizeContent(raw).slice(0, 5000);
    loaded.push({
      id: `k_plan_${file.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      topic: resolveTopicFromFile(file),
      content,
      effectiveDate: new Date().toISOString().slice(0, 10),
      sourceDoc: `.cursor/plans/${file}`,
      approvedBy: "founder",
      tags: ["plan-ingested", file.replace(".md", "")],
    });
  }
  return loaded;
}
