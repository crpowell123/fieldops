import { createClerkClient } from '@clerk/backend';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export interface AuthenticatedRequest extends FastifyRequest {
  tenantId: string;
  userId: string;
  clerkUserId: string;
  userRole: string;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Missing token' });
  }

  try {
    const payload = await clerk.verifyToken(token);
    const clerkUserId = payload.sub;

    // Resolve the tenant from the Clerk org claim
    const orgId = payload.org_id as string | undefined;
    if (!orgId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'No organization context' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!tenant) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Tenant not found' });
    }

    const tenantUser = await prisma.tenantUser.findUnique({
      where: { tenantId_clerkUserId: { tenantId: tenant.id, clerkUserId } },
    });

    if (!tenantUser) {
      return reply.status(403).send({ error: 'Forbidden', message: 'User not in tenant' });
    }

    // Attach to request
    (request as AuthenticatedRequest).tenantId = tenant.id;
    (request as AuthenticatedRequest).userId = tenantUser.id;
    (request as AuthenticatedRequest).clerkUserId = clerkUserId;
    (request as AuthenticatedRequest).userRole = tenantUser.role;
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authReq = request as AuthenticatedRequest;
    if (!roles.includes(authReq.userRole)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Required role: ${roles.join(' or ')}`,
      });
    }
  };
}

export function requirePlan(...plans: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authReq = request as AuthenticatedRequest;
    const tenant = await prisma.tenant.findUnique({
      where: { id: authReq.tenantId },
    });
    if (!tenant || !plans.includes(tenant.plan)) {
      return reply.status(402).send({
        error: 'Payment Required',
        message: `This feature requires plan: ${plans.join(' or ')}`,
        upgradeUrl: `${process.env.WEB_URL}/billing`,
      });
    }
  };
}
