import { Queue } from 'bullmq';
import { redis } from '../index';

// ── QUEUES ────────────────────────────────────────────────────────────────────

export const cwSyncQueue = new Queue('cw-sync', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const aiQueue = new Queue('ai-jobs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 3000 },
    removeOnComplete: { count: 50 },
  },
});

export const reportQueue = new Queue('reports', {
  connection: redis,
});

// ── JOB HELPERS ───────────────────────────────────────────────────────────────

export async function addCWSyncJob(tenantId: string) {
  return cwSyncQueue.add(
    'sync-tenant',
    { tenantId },
    { jobId: `cw-sync-${tenantId}` } // Deduplicate
  );
}

export async function schedulePeriodicSync(tenantId: string) {
  // Sync every 15 minutes
  return cwSyncQueue.add(
    'sync-tenant',
    { tenantId },
    {
      jobId: `cw-sync-${tenantId}-periodic`,
      repeat: { every: 15 * 60 * 1000 },
    }
  );
}

export async function addAIAnalysisJob(params: {
  tenantId: string;
  type: 'regulatory' | 'risk-analysis';
  payload: Record<string, unknown>;
}) {
  return aiQueue.add('ai-analysis', params);
}
