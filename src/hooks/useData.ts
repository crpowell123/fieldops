import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../lib/api';
import type {
  Project, Engineer, Risk, Lesson,
  SchedulePhase, ProcurementItem, ChecklistItem,
  ResourceSpan, ResourceAllocation,
} from '../lib/types';

// ── PROJECTS ──────────────────────────────────────────────────────────────────

export function useProjects() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<{ data: Project[] }>('/projects').then(r => r.data),
  });
}

export function useProject(id: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.get<{ data: Project }>(`/projects/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) =>
      api.post<{ data: Project }>('/projects', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Project> & { id: string }) =>
      api.patch<{ data: Project }>(`/projects/${id}`, data).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects', vars.id] });
    },
  });
}

// ── ENGINEERS ─────────────────────────────────────────────────────────────────

export function useEngineers() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['engineers'],
    queryFn: () => api.get<{ data: Engineer[] }>('/engineers').then(r => r.data),
  });
}

// ── RESOURCE SPANS ────────────────────────────────────────────────────────────

export function useResourceAllocations() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['resource-allocations'],
    queryFn: () => api.get<{ data: ResourceAllocation[] }>('/resources/allocations').then(r => r.data),
  });
}

export function useResourceSpans() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['resource-spans'],
    queryFn: () => api.get<{ data: ResourceSpan[] }>('/resources/spans').then(r => r.data),
  });
}

export function useUpdateResourceSpan() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ResourceSpan> & { id: string }) =>
      api.patch<{ data: ResourceSpan }>(`/resources/spans/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resource-spans'] }),
  });
}

// ── RISKS ─────────────────────────────────────────────────────────────────────

export function useRisks(projectId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => {
      const qs = projectId ? `?projectId=${projectId}` : '';
      return api.get<{ data: Risk[] }>(`/risks${qs}`).then(r => r.data);
    },
  });
}

export function useCreateRisk() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Risk>) =>
      api.post<{ data: Risk }>('/risks', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks'] }),
  });
}

// ── REGULATORY ────────────────────────────────────────────────────────────────

export function useAnalyzeRegulations() {
  const api = useApiClient();
  return useMutation({
    mutationFn: (params: {
      state: string;
      workTypes: string[];
      projectDescription?: string;
      locality?: string;
      projectId?: string;
    }) => api.post('/regulatory/analyze', params),
  });
}

// ── LESSONS ───────────────────────────────────────────────────────────────────

export function useLessons() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['lessons'],
    queryFn: () => api.get<{ data: Lesson[] }>('/lessons').then(r => r.data),
  });
}

// ── SCHEDULE ──────────────────────────────────────────────────────────────────

export function useSchedule(projectId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['schedule', projectId],
    queryFn: () => {
      const qs = projectId ? `?projectId=${projectId}` : '';
      return api.get<{ data: SchedulePhase[] }>(`/schedule${qs}`).then(r => r.data);
    },
  });
}

// ── PROCUREMENT ───────────────────────────────────────────────────────────────

export function useProcurement(projectId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['procurement', projectId],
    queryFn: () => {
      const qs = projectId ? `?projectId=${projectId}` : '';
      return api.get<{ data: ProcurementItem[] }>(`/procurement${qs}`).then(r => r.data);
    },
  });
}

// ── CHECKLIST ─────────────────────────────────────────────────────────────────

export function useChecklist(projectId?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['checklist', projectId],
    queryFn: () => {
      const qs = projectId ? `?projectId=${projectId}` : '';
      return api.get<{ data: ChecklistItem[] }>(`/checklist${qs}`).then(r => r.data);
    },
  });
}

// ── CONNECTWISE ───────────────────────────────────────────────────────────────

export function useCWStatus() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['cw-status'],
    queryFn: () => api.get<{ data: { syncStatus: string; lastSyncedAt: string | null } | null }>('/connectwise/status').then(r => r.data),
    refetchInterval: 30_000,
  });
}

export function useCWSync() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/connectwise/sync'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cw-status'] });
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['projects'] });
        qc.invalidateQueries({ queryKey: ['engineers'] });
      }, 5000);
    },
  });
}
