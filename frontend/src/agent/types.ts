export type Channel = "email" | "social_dm";

export type Intent =
  | "pricing_inquiry"
  | "media_kit_request"
  | "onboarding_status"
  | "scheduling_request"
  | "support_escalation"
  | "general_info";

export type RiskLevel = "low" | "medium" | "high";

export type ThreadStatus =
  | "received"
  | "drafted"
  | "pending_approval"
  | "sent"
  | "escalated";

export type ApprovalDecision = "pending" | "approved" | "rejected" | "auto_approved";

export type DealStage =
  | "targeted"
  | "contacted"
  | "discovery_booked"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost"
  | "renewal";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
export type DealSlaType = "first_response" | "proposal_turnaround" | "post_campaign_recap";
export type UserRole = "owner" | "sales" | "operations";
export type EntityType = "company" | "contact" | "deal" | "task" | "thread" | "contract" | "invoice";

export type OnboardingTaskType =
  | "intake_form"
  | "asset_collection"
  | "creative_timeline"
  | "launch_date_confirmation"
  | "reporting_setup";

export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  title?: string;
  companyId?: string;
  ownerId?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailThread {
  id: string;
  contactId: string;
  dealId?: string;
  channel: Channel;
  subject: string;
  body: string;
  intent: Intent;
  risk: RiskLevel;
  confidence: number;
  status: ThreadStatus;
  draftReply?: string;
  sourceKnowledgeIds: string[];
  approvalDecision: ApprovalDecision;
  approvalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialDmThread extends Omit<EmailThread, "subject"> {
  subject: string;
  dmProvider?: string;
  dmThreadExternalId?: string;
  dmHandle?: string;
}

export type MessageThread = EmailThread | SocialDmThread;

export interface EmailMessage {
  id: string;
  threadId: string;
  contactId: string;
  direction: "inbound" | "outbound";
  providerMessageId: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface OutboundSendResult {
  ok: boolean;
  providerMessageId: string;
  providerThreadId?: string;
}

export interface Deal {
  id: string;
  companyId: string;
  primaryContactId?: string;
  stage: DealStage;
  mrr?: number;
  oneTimeRevenue?: number;
  weightedValue?: number;
  packageName?: string;
  closeDate?: string;
  renewalDate?: string;
  ownerRole: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface DealStageHistory {
  id: string;
  dealId: string;
  fromStage?: DealStage;
  toStage: DealStage;
  changedByRole: UserRole;
  reason?: string;
  changedAt: string;
}

export interface DealSla {
  id: string;
  dealId: string;
  type: DealSlaType;
  dueAt: string;
  completedAt?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CRMActivity {
  id: string;
  entityType: EntityType;
  entityId: string;
  contactId?: string;
  dealId?: string;
  threadId?: string;
  type: "email_received" | "email_sent" | "approval_required" | "meeting_scheduled" | "onboarding_update";
  summary: string;
  createdAt: string;
}

export interface CRMTask {
  id: string;
  title: string;
  status: TaskStatus;
  dueAt?: string;
  assigneeRole: UserRole;
  contactId?: string;
  dealId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingTask {
  id: string;
  dealId: string;
  type: OnboardingTaskType;
  status: "pending" | "in_progress" | "completed";
  dueAt?: string;
  assignee?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentReport {
  id: string;
  date: string;
  threadsHandled: number;
  autoSent: number;
  pendingApprovals: number;
  escalations: number;
  syncFailures: number;
  onboardingDueNext48h: number;
  summary: string;
  channelBreakdown?: {
    email: number;
    socialDm: number;
  };
  outreach?: {
    activeEnrollments: number;
    pausedEnrollments: number;
    completedEnrollments: number;
  };
  createdAt: string;
}

export interface SequenceStep {
  id: string;
  order: number;
  channel: Channel;
  templateSubject: string;
  templateBody: string;
  waitDaysAfterPrevious: number;
}

export interface Sequence {
  id: string;
  name: string;
  stopOnReply: boolean;
  stopOnMeetingBooked: boolean;
  createdAt: string;
  updatedAt: string;
  steps: SequenceStep[];
}

export type SequenceEnrollmentStatus = "active" | "paused" | "completed" | "stopped";

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  contactId: string;
  dealId?: string;
  currentStepOrder: number;
  status: SequenceEnrollmentStatus;
  lastAdvancedAt?: string;
  stopReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContractStatus = "draft" | "sent" | "signed" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Contract {
  id: string;
  companyId: string;
  dealId: string;
  status: ContractStatus;
  amount: number;
  startsOn?: string;
  endsOn?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  contractId: string;
  companyId: string;
  dealId: string;
  status: InvoiceStatus;
  amount: number;
  dueAt: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  touchesThisWeek: number;
  discoveryCallsBooked: number;
  proposalsSent: number;
  conversionRatePercent: number;
  newMrr: number;
  oneTimeRevenue: number;
  blendedAccountValue: number;
  renewalPipelineCount: number;
}

export interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  effectiveDate: string;
  expiresAt?: string;
  sourceDoc: string;
  approvedBy: string;
  tags: string[];
}

export interface PolicyConfig {
  maxDiscountPercent: number;
  allowExclusivityOnlyForTopPackage: boolean;
  blockedContractLanguage: string[];
  highRiskKeywords: string[];
}
