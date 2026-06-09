// ── TENANT / AUTH ─────────────────────────────────────────────────────────────

export type Plan = 'starter' | 'growth' | 'enterprise';

export interface Tenant {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  plan: Plan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  avatarUrl: string | null;
  createdAt: string;
}

// ── CONNECTWISE CREDENTIALS (encrypted at rest) ───────────────────────────────

export interface CWCredentials {
  id: string;
  tenantId: string;
  companyId: string;
  site: string;
  clientId: string;
  publicKey: string;
  privateKey: string; // AES-256 encrypted
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  syncError: string | null;
}

// ── PROJECTS ──────────────────────────────────────────────────────────────────

export type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

export interface Project {
  id: string;
  tenantId: string;
  cwProjectId: string | null; // ConnectWise project ID
  name: string;
  company: string;
  status: ProjectStatus;
  budget: number;
  spent: number;
  phase: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── ENGINEERS / RESOURCES ─────────────────────────────────────────────────────

export interface Engineer {
  id: string;
  tenantId: string;
  cwMemberId: string | null;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  color: string;
  capacityHoursPerWeek: number;
  isActive: boolean;
  createdAt: string;
}

export interface ResourceAllocation {
  id: string;
  tenantId: string;
  engineerId: string;
  projectId: string;
  hoursPerWeek: number;
  role: string;
  startDate: string | null;
  endDate: string | null;
}

export interface ResourceSpan {
  id: string;
  tenantId: string;
  engineerId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  role: string;
}

// ── RISKS ─────────────────────────────────────────────────────────────────────

export type RiskStatus = 'Open' | 'Watching' | 'Accepted' | 'Closed';
export type RiskCategory =
  | 'Scope'
  | 'Resource'
  | 'Technical'
  | 'Commercial'
  | 'Security'
  | 'Supply Chain'
  | 'Vendor'
  | 'Regulatory';

export interface Risk {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  category: RiskCategory;
  probability: number; // 1-5
  impact: number; // 1-5
  status: RiskStatus;
  mitigation: string;
  linkedProposal: string | null;
  owner: string;
  raisedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── REGULATORY ────────────────────────────────────────────────────────────────

export type WorkTypeId =
  | 'network_cabling'
  | 'trenching'
  | 'aerial_cable'
  | 'fiber'
  | 'access_control'
  | 'surveillance';

export interface RegulatoryAnalysis {
  id: string;
  tenantId: string;
  projectId: string | null;
  state: string;
  locality: string | null;
  workTypes: WorkTypeId[];
  projectDescription: string | null;
  result: RegulatoryResult;
  createdAt: string;
}

export interface RegulatoryResult {
  summary: string;
  federalRequirements: RegulatoryRequirement[];
  stateRequirements: RegulatoryRequirement[];
  permits: RegulatoryPermit[];
  localConsiderations: LocalConsideration[];
  riskFlags: RegulatoryRiskFlag[];
  recommendedActions: string[];
}

export interface RegulatoryRequirement {
  title: string;
  authority: string;
  description: string;
  applicableWorkTypes: WorkTypeId[];
  severity: 'Critical' | 'High' | 'Medium';
  action: string;
  licenseRequired?: boolean;
  licenseName?: string | null;
}

export interface RegulatoryPermit {
  permitName: string;
  issuingAuthority: string;
  applicableWorkTypes: WorkTypeId[];
  typicalLeadTime: string;
  estimatedCost: string;
  notes: string;
  severity: 'Critical' | 'High' | 'Medium';
}

export interface LocalConsideration {
  title: string;
  description: string;
  applicableWorkTypes: WorkTypeId[];
}

export interface RegulatoryRiskFlag {
  title: string;
  description: string;
  applicableWorkTypes: WorkTypeId[];
  probability: number;
  impact: number;
  mitigation: string;
}

// ── LESSONS LEARNED ───────────────────────────────────────────────────────────

export type LessonImpact = 'Positive' | 'Negative' | 'Neutral';
export type LessonCategory =
  | 'Planning'
  | 'Technical'
  | 'Communication'
  | 'Vendor'
  | 'Security'
  | 'Scope';

export interface Lesson {
  id: string;
  tenantId: string;
  projectId: string;
  date: string;
  category: LessonCategory;
  what: string;
  impact: LessonImpact;
  recommendation: string;
  addedByUserId: string;
  addedByName: string;
  createdAt: string;
}

// ── SCHEDULE ──────────────────────────────────────────────────────────────────

export type PhaseStatus = 'Upcoming' | 'In Progress' | 'Done' | 'Delayed';

export interface SchedulePhase {
  id: string;
  tenantId: string;
  projectId: string;
  phase: string;
  startDate: string;
  endDate: string;
  status: PhaseStatus;
  owner: string;
  dependencies: string[]; // array of phase IDs
  isMilestone: boolean;
  createdAt: string;
}

// ── PROCUREMENT ───────────────────────────────────────────────────────────────

export type ProcurementStatus =
  | 'Pending PO'
  | 'On Order'
  | 'In Transit'
  | 'Delivered'
  | 'Provisioned'
  | 'Backordered';

export interface ProcurementItem {
  id: string;
  tenantId: string;
  projectId: string;
  item: string;
  vendor: string;
  qty: number;
  unitCost: number;
  status: ProcurementStatus;
  orderedAt: string | null;
  eta: string | null;
  poNumber: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── CHECKLIST ─────────────────────────────────────────────────────────────────

export type ChecklistCategory = 'Tools' | 'Materials' | 'Docs' | 'Access' | 'Safety';

export interface ChecklistItem {
  id: string;
  tenantId: string;
  projectId: string;
  category: ChecklistCategory;
  item: string;
  checked: boolean;
  assigneeId: string | null;
  assigneeName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── API RESPONSES ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ── BILLING ───────────────────────────────────────────────────────────────────

export interface PlanLimits {
  maxEngineers: number | null;
  maxProjects: number | null;
  hasAI: boolean;
  hasRegulatory: boolean;
  hasSSO: boolean;
  hasAPI: boolean;
  hasWhiteLabel: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter: {
    maxEngineers: 3,
    maxProjects: 10,
    hasAI: false,
    hasRegulatory: false,
    hasSSO: false,
    hasAPI: false,
    hasWhiteLabel: false,
  },
  growth: {
    maxEngineers: 10,
    maxProjects: null,
    hasAI: true,
    hasRegulatory: true,
    hasSSO: false,
    hasAPI: false,
    hasWhiteLabel: false,
  },
  enterprise: {
    maxEngineers: null,
    maxProjects: null,
    hasAI: true,
    hasRegulatory: true,
    hasSSO: true,
    hasAPI: true,
    hasWhiteLabel: true,
  },
};
