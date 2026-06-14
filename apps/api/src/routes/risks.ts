import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const RiskSchema = z.object({
  projectId:      z.string(),
  title:          z.string().min(1).max(500),
  category:       z.enum(['Scope','Resource','Technical','Commercial','Security','Supply Chain','Vendor','Regulatory']),
  probability:    z.number().int().min(1).max(5),
  impact:         z.number().int().min(1).max(5),
  status:         z.enum(['Open','Watching','Accepted','Closed']).optional().default('Open'),
  mitigation:     z.string().optional().default(''),
  linkedProposal: z.string().optional().nullable(),
  owner:          z.string().min(1),
});

export async function riskRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /risks  — optionally filter by projectId
  app.get('/', async (request) => {
    const req = request as AuthenticatedRequest;
    const { projectId } = request.query as { projectId?: string };

    const risks = await prisma.risk.findMany({
      where: {
        project: { tenantId: req.tenantId },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [{ probability: 'desc' }, { impact: 'desc' }],
    });
    return { data: risks };
  });

  // POST /risks
  app.post('/', async (request, reply) => {
    const req  = request as AuthenticatedRequest;
    const body = RiskSchema.parse(request.body);

    // Verify project belongs to this tenant
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, tenantId: req.tenantId },
    });
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const risk = await prisma.risk.create({ data: body });
    return reply.status(201).send({ data: risk });
  });

  // PATCH /risks/:id
  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const req  = request as AuthenticatedRequest;
    const body = RiskSchema.partial().parse(request.body);

    // Verify risk belongs to this tenant via project join
    const existing = await prisma.risk.findFirst({
      where: { id: request.params.id, project: { tenantId: req.tenantId } },
    });
    if (!existing) {
      return reply.status(404).send({ error: 'Risk not found' });
    }

    const risk = await prisma.risk.update({
      where: { id: request.params.id },
      data: body,
    });
    return { data: risk };
  });

  // DELETE /risks/:id
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const req = request as AuthenticatedRequest;

    const existing = await prisma.risk.findFirst({
      where: { id: request.params.id, project: { tenantId: req.tenantId } },
    });
    if (!existing) {
      return reply.status(404).send({ error: 'Risk not found' });
    }

    await prisma.risk.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}
