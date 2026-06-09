import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import 'dotenv/config';

import { processCWSync } from './jobs/cw-sync';
import { processAIJob } from './jobs/ai-analysis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

// ── ConnectWise Sync Worker ────────────────────────────────────────────────────

const cwWorker = new Worker(
  'cw-sync',
  async (job) => {
    console.log(`[CW Sync] Processing tenant: ${job.data.tenantId}`);
    await processCWSync(job.data.tenantId, prisma);
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 tenants simultaneously
  }
);

cwWorker.on('completed', (job) => {
  console.log(`[CW Sync] Completed for tenant: ${job.data.tenantId}`);
});

cwWorker.on('failed', (job, err) => {
  console.error(`[CW Sync] Failed for tenant: ${job?.data.tenantId}`, err);
});

// ── AI Jobs Worker ────────────────────────────────────────────────────────────

const aiWorker = new Worker(
  'ai-jobs',
  async (job) => {
    console.log(`[AI] Processing job: ${job.data.type}`);
    await processAIJob(job.data, prisma);
  },
  {
    connection: redis,
    concurrency: 3,
    limiter: { max: 10, duration: 60000 }, // 10 AI jobs per minute
  }
);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown() {
  console.log('Shutting down workers...');
  await cwWorker.close();
  await aiWorker.close();
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('FieldOps Worker running');
