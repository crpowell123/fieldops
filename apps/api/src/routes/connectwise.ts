import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth, requireRole } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { ConnectWiseClient } from '@fieldops/cw-client';
import { encrypt, decrypt } from '../lib/crypto';

const SaveCredentialsSchema = z.object({
  companyId: z.string().min(1),
  site: z.string().min(1),
  clientId: z.string().min(1),
  publicKey: z.string().min(1),
  privateKey: z.string().min(1),
});

export async function cwRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /api/v1/connectwise/status
  app.get('/status', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const creds = await prisma.cWCredential.findUnique({
      where: { tenantId: req.tenantId },
      select: {
        id: true,
        companyId: true,
        site: true,
        clientId: true,
        lastSyncedAt: true,
        syncStatus: true,
        syncError: true,
        // Never return keys
      },
    });
    return { data: creds };
  });

  // POST /api/v1/connectwise/credentials
  app.post('/credentials', {
    preHandler: requireRole('owner', 'admin'),
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = SaveCredentialsSchema.parse(request.body);

    // Validate before saving
    const client = new ConnectWiseClient({
      companyId: body.companyId,
      site: body.site,
      clientId: body.clientId,
      publicKey: body.publicKey,
      privateKey: body.privateKey,
    });

    const valid = await client.validateCredentials();
    if (!valid) {
      return reply.status(400).send({
        error: 'Invalid credentials',
        message: 'Could not connect to ConnectWise PSA with the provided credentials.',
      });
    }

    const info = await client.getSystemInfo();

    // Save with encrypted private key
    const creds = await prisma.cWCredential.upsert({
      where: { tenantId: req.tenantId },
      create: {
        tenantId: req.tenantId,
        companyId: body.companyId,
        site: body.site,
        clientId: body.clientId,
        publicKey: body.publicKey,
        privateKey: encrypt(body.privateKey),
      },
      update: {
        companyId: body.companyId,
        site: body.site,
        clientId: body.clientId,
        publicKey: body.publicKey,
        privateKey: encrypt(body.privateKey),
        syncError: null,
        syncStatus: 'idle',
      },
    });

    return reply.status(201).send({
      data: {
        connected: true,
        companyName: info.companyName,
        version: info.version,
      },
    });
  });

  // POST /api/v1/connectwise/sync
  app.post('/sync', {
    preHandler: requireRole('owner', 'admin'),
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const creds = await prisma.cWCredential.findUnique({
      where: { tenantId: req.tenantId },
    });

    if (!creds) {
      return reply.status(400).send({
        error: 'Not connected',
        message: 'No ConnectWise credentials configured.',
      });
    }

    // Queue sync job (non-blocking)
    const { addCWSyncJob } = await import('../lib/queue');
    await addCWSyncJob(req.tenantId);

    await prisma.cWCredential.update({
      where: { tenantId: req.tenantId },
      data: { syncStatus: 'syncing' },
    });

    return { data: { queued: true, message: 'Sync started' } };
  });

  // DELETE /api/v1/connectwise/credentials
  app.delete('/credentials', {
    preHandler: requireRole('owner'),
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    await prisma.cWCredential.delete({ where: { tenantId: req.tenantId } });
    return reply.status(204).send();
  });
}
