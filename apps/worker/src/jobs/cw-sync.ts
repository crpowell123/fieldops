import type { PrismaClient } from '@prisma/client';
import { ConnectWiseClient } from '@fieldops/cw-client';
import { createDecipheriv } from 'crypto';

function decrypt(ciphertext: string): string {
  const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export async function processCWSync(tenantId: string, prisma: PrismaClient) {
  // Mark as syncing
  await prisma.cWCredential.update({
    where: { tenantId },
    data: { syncStatus: 'syncing', syncError: null },
  });

  try {
    const creds = await prisma.cWCredential.findUnique({
      where: { tenantId },
    });

    if (!creds) throw new Error('No CW credentials found');

    const client = new ConnectWiseClient({
      companyId: creds.companyId,
      site: creds.site,
      clientId: creds.clientId,
      publicKey: creds.publicKey,
      privateKey: decrypt(creds.privateKey),
    });

    // ── Sync Projects ────────────────────────────────────────────────────────
    console.log(`[CW Sync] Fetching projects for tenant ${tenantId}`);
    const cwProjects = await client.getAllProjects();

    for (const cwProject of cwProjects) {
      await prisma.project.upsert({
        where: { cwProjectId: String(cwProject.id) },
        create: {
          cwProjectId: String(cwProject.id),
          name: cwProject.name,
          company: cwProject.company?.name || 'Unknown',
          status: mapProjectStatus(cwProject.status.name),
          budget: cwProject.budget || 0,
          spent: 0,
          phase: '',
          startDate: cwProject.estimatedStart ? new Date(cwProject.estimatedStart) : null,
          endDate: cwProject.estimatedEnd ? new Date(cwProject.estimatedEnd) : null,
        },
        update: {
          name: cwProject.name,
          company: cwProject.company?.name || 'Unknown',
          status: mapProjectStatus(cwProject.status.name),
          budget: cwProject.budget || 0,
          startDate: cwProject.estimatedStart ? new Date(cwProject.estimatedStart) : null,
          endDate: cwProject.estimatedEnd ? new Date(cwProject.estimatedEnd) : null,
        },
      });
    }

    // ── Sync Engineers (CW Members) ──────────────────────────────────────────
    console.log(`[CW Sync] Fetching members for tenant ${tenantId}`);
    const cwMembers = await client.getMembers();

    const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#a78bfa','#14b8a6','#3b82f6','#f97316'];
    for (let i = 0; i < cwMembers.length; i++) {
      const m = cwMembers[i];
      await prisma.engineer.upsert({
        where: { cwMemberId: String(m.id) },
        create: {
          cwMemberId: String(m.id),
          name: `${m.firstName} ${m.lastName}`.trim(),
          email: m.primaryEmail,
          role: m.title || 'Engineer',
          color: COLORS[i % COLORS.length],
          isActive: true,
        },
        update: {
          name: `${m.firstName} ${m.lastName}`.trim(),
          email: m.primaryEmail,
          role: m.title || 'Engineer',
        },
      });
    }

    // Mark sync complete
    await prisma.cWCredential.update({
      where: { tenantId },
      data: {
        syncStatus: 'idle',
        lastSyncedAt: new Date(),
      },
    });

    console.log(`[CW Sync] Complete: ${cwProjects.length} projects, ${cwMembers.length} members`);
  } catch (err) {
    await prisma.cWCredential.update({
      where: { tenantId },
      data: {
        syncStatus: 'error',
        syncError: err instanceof Error ? err.message : 'Unknown error',
      },
    });
    throw err;
  }
}

function mapProjectStatus(cwStatus: string): string {
  const s = cwStatus.toLowerCase();
  if (s.includes('complete') || s.includes('closed')) return 'Completed';
  if (s.includes('hold')) return 'On Hold';
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('plan') || s.includes('new')) return 'Planning';
  return 'In Progress';
}
