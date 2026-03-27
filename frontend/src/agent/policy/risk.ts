import { policyConfig } from "@/src/agent/knowledge/base";
import type { MessageThread, RiskLevel } from "@/src/agent/types";

export function detectRiskLevel(text: string): RiskLevel {
  const normalized = text.toLowerCase();
  const matches = policyConfig.highRiskKeywords.filter((keyword) =>
    normalized.includes(keyword),
  );

  if (matches.length >= 2) return "high";
  if (matches.length === 1) return "medium";
  return "low";
}

export function requiresHumanApproval(thread: Pick<MessageThread, "risk" | "body">): {
  required: boolean;
  reason?: string;
} {
  if (thread.risk === "high") {
    return { required: true, reason: "High-risk message content detected." };
  }

  const normalized = thread.body.toLowerCase();
  const blocked = policyConfig.blockedContractLanguage.find((phrase) =>
    normalized.includes(phrase.toLowerCase()),
  );
  if (blocked) {
    return { required: true, reason: `Blocked legal phrase detected: "${blocked}".` };
  }

  if (thread.risk === "medium") {
    return {
      required: true,
      reason: "Medium-risk communication requires selective human review policy.",
    };
  }

  return { required: false };
}

export function validateDiscount(percent: number): {
  valid: boolean;
  reason?: string;
} {
  if (percent <= policyConfig.maxDiscountPercent) return { valid: true };
  return {
    valid: false,
    reason: `Discount exceeds policy max (${policyConfig.maxDiscountPercent}%).`,
  };
}
