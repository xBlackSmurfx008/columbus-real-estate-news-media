import { detectRiskLevel } from "@/src/agent/policy/risk";
import type { Intent } from "@/src/agent/types";

interface ClassificationResult {
  intent: Intent;
  confidence: number;
}

const intentMatchers: Array<{ intent: Intent; keywords: string[] }> = [
  {
    intent: "pricing_inquiry",
    keywords: ["price", "pricing", "rate", "cost", "package"],
  },
  {
    intent: "media_kit_request",
    keywords: ["media kit", "advertise", "sponsor", "inventory"],
  },
  {
    intent: "onboarding_status",
    keywords: ["onboarding", "launch status", "asset", "timeline"],
  },
  {
    intent: "scheduling_request",
    keywords: ["schedule", "meeting", "calendar", "availability", "time"],
  },
  {
    intent: "support_escalation",
    keywords: ["issue", "complaint", "not working", "refund", "cancel"],
  },
];

export function classifyIntent(subject: string, body: string): ClassificationResult {
  const text = `${subject} ${body}`.toLowerCase();

  let best: ClassificationResult = { intent: "general_info", confidence: 0.5 };
  for (const matcher of intentMatchers) {
    const score = matcher.keywords.reduce((acc, keyword) => {
      return text.includes(keyword) ? acc + 0.15 : acc;
    }, 0.45);
    if (score > best.confidence) {
      best = { intent: matcher.intent, confidence: Math.min(score, 0.95) };
    }
  }

  return best;
}

export function classifyRisk(subject: string, body: string) {
  return detectRiskLevel(`${subject} ${body}`);
}
