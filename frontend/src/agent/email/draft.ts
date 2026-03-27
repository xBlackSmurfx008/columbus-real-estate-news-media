import { getKnowledgeByTopic, searchKnowledge } from "@/src/agent/knowledge/base";
import type { Intent, KnowledgeEntry } from "@/src/agent/types";

function selectKnowledge(intent: Intent, body: string): KnowledgeEntry[] {
  if (intent === "pricing_inquiry") return getKnowledgeByTopic("pricing");
  if (intent === "media_kit_request") return getKnowledgeByTopic("media_kit");
  if (intent === "onboarding_status") return getKnowledgeByTopic("onboarding");
  if (intent === "general_info") return searchKnowledge(body).slice(0, 3);
  return searchKnowledge(body).slice(0, 2);
}

function ctaForIntent(intent: Intent): string {
  if (intent === "scheduling_request") {
    return "If you share 2-3 preferred times, we can confirm a meeting slot quickly.";
  }
  if (intent === "pricing_inquiry" || intent === "media_kit_request") {
    return "If helpful, I can also send a one-page package recommendation based on your goals.";
  }
  if (intent === "onboarding_status") {
    return "If you want, I can send the current onboarding checklist with ETA for each milestone.";
  }
  return "Happy to tailor this to your goals if you share your campaign priorities.";
}

export function buildDraftReply(intent: Intent, subject: string, body: string): {
  draft: string;
  sourceKnowledgeIds: string[];
} {
  const entries = selectKnowledge(intent, `${subject} ${body}`);
  const evidence = entries.map((e) => `- ${e.content}`).join("\n");

  const opening =
    "Thanks for reaching out. Here is the most current information from our approved media and pricing materials:";
  const closing = ctaForIntent(intent);

  const draft = `${opening}\n\n${evidence || "- We can provide current package and onboarding details on request."}\n\n${closing}`;
  return {
    draft,
    sourceKnowledgeIds: entries.map((e) => e.id),
  };
}
