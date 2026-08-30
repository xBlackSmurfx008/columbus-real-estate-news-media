export type AgentCapability =
  | "dashboard:read"
  | "crm:read"
  | "crm:write"
  | "email:process"
  | "email:approve"
  | "social:process"
  | "social:approve"
  | "sequence:manage"
  | "sequence:execute"
  | "onboarding:manage"
  | "billing:manage"
  | "schedule:manage"
  | "report:read"
  | "report:write"
  | "research:prepare"
  | "pilot:run";

const roleCapabilities: Record<string, readonly AgentCapability[]> = {
  admin: [
    "dashboard:read",
    "crm:read",
    "crm:write",
    "email:process",
    "email:approve",
    "social:process",
    "social:approve",
    "sequence:manage",
    "sequence:execute",
    "onboarding:manage",
    "billing:manage",
    "schedule:manage",
    "report:read",
    "report:write",
    "research:prepare",
    "pilot:run",
  ],
  owner: [
    "dashboard:read",
    "crm:read",
    "crm:write",
    "email:process",
    "email:approve",
    "social:process",
    "social:approve",
    "sequence:manage",
    "sequence:execute",
    "onboarding:manage",
    "billing:manage",
    "schedule:manage",
    "report:read",
    "report:write",
    "research:prepare",
    "pilot:run",
  ],
  sales: [
    "dashboard:read",
    "crm:read",
    "crm:write",
    "email:process",
    "email:approve",
    "social:process",
    "social:approve",
    "sequence:manage",
    "sequence:execute",
    "onboarding:manage",
    "schedule:manage",
    "report:read",
    "research:prepare",
  ],
  operations: [
    "dashboard:read",
    "crm:read",
    "crm:write",
    "email:process",
    "social:process",
    "onboarding:manage",
    "report:read",
    "report:write",
    "research:prepare",
    "pilot:run",
  ],
};

export function hasAgentCapability(role: string, capability: AgentCapability): boolean {
  return roleCapabilities[role]?.includes(capability) ?? false;
}

export function getAgentCapabilities(role: string): AgentCapability[] {
  return [...(roleCapabilities[role] || [])];
}
