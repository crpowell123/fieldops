// Local copy of shared types (replaces @fieldops/types workspace package for Vercel deployment)

export type Plan = 'starter' | 'growth' | 'enterprise';

export type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

export type WorkTypeId =
  | 'network_cabling'
  | 'trenching'
  | 'aerial_cable'
  | 'fiber'
  | 'access_control'
  | 'surveillance';

export type RiskStatus   = 'Open' | 'Watching' | 'Accepted' | 'Closed';
export type RiskCategory =
  | 'Scope' | 'Resource' | 'Technical' | 'Commercial'
  | 'Security' | 'Supply Chain' | 'Vendor' | 'Regulatory';

export type LessonImpact   = 'Positive' | 'Negative' | 'Neutral';
export type LessonCategory = 'Planning' | 'Technical' | 'Communication' | 'Vendor' | 'Security' | 'Scope';
export type PhaseStatus    = 'Upcoming' | 'In Progress' | 'Done' | 'Delayed';
export type ProcurementStatus =
  | 'Pending PO' | 'On Order' | 'In Transit'
  | 'Delivered'  | 'Provisioned' | 'Backordered';
export type ChecklistCategory = 'Tools' | 'Materials' | 'Docs' | 'Access' | 'Safety';

export interface Project {
  id: string; tenantId: string; cwProjectId: string | null;
  name: string; company: string; status: ProjectStatus;
  budget: number; spent: number; phase: string;
  startDate: string | null; endDate: string | null;
  description: string | null; createdAt: string; updatedAt: string;
}
export interface Engineer {
  id: string; tenantId: string; cwMemberId: string | null;
  name: string; email: string; role: string;
  avatarUrl: string | null; color: string;
  capacityHoursPerWeek: number; isActive: boolean; createdAt: string;
}
export interface ResourceAllocation {
  id: string; tenantId: string; engineerId: string; projectId: string;
  hoursPerWeek: number; role: string;
  startDate: string | null; endDate: string | null;
}
export interface ResourceSpan {
  id: string; tenantId: string; engineerId: string; projectId: string;
  startDate: string; endDate: string; hoursPerDay: number; role: string;
}
export interface Risk {
  id: string; tenantId: string; projectId: string; title: string;
  category: RiskCategory; probability: number; impact: number;
  status: RiskStatus; mitigation: string;
  linkedProposal: string | null; owner: string;
  raisedAt: string; createdAt: string; updatedAt: string;
}
export interface Lesson {
  id: string; tenantId: string; projectId: string; date: string;
  category: LessonCategory; what: string; impact: LessonImpact;
  recommendation: string; addedByUserId: string; addedByName: string; createdAt: string;
}
export interface SchedulePhase {
  id: string; tenantId: string; projectId: string; phase: string;
  startDate: string; endDate: string; status: PhaseStatus;
  owner: string; dependencies: string[]; isMilestone: boolean; createdAt: string;
}
export interface ProcurementItem {
  id: string; tenantId: string; projectId: string; item: string;
  vendor: string; qty: number; unitCost: number; status: ProcurementStatus;
  orderedAt: string | null; eta: string | null; poNumber: string | null;
  notes: string; createdAt: string; updatedAt: string;
}
export interface ChecklistItem {
  id: string; tenantId: string; projectId: string;
  category: ChecklistCategory; item: string; checked: boolean;
  assigneeId: string | null; assigneeName: string; notes: string;
  createdAt: string; updatedAt: string;
}
