import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';

const RiskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  category: z.enum(['Scope','Resource','Technical','Commercial','Security','Supply Chain','Vendor','Regulatory']),
  probability: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  status: z.enum(['Open','Watching','Accepted','Closed']).optional(),
  mitigation: z.string().optional(),
  linkedProposal: z.string().optional().nullable(),
  owner: z.string(),
});

export async function riskRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const { projectId } = request.query as { projectId?: string };
    const risks = await prisma.risk.findMany({
      where: projectId ? { projectId } : {},
      orderBy: [{ probability: 'desc' }, { impact: 'desc' }],
    });
    return { data: risks };
  });

  app.post('/', async (request, reply) => {
    const body = RiskSchema.parse(request.body);
    const risk = await prisma.risk.create({ data: body });
    return reply.status(201).send({ data: risk });
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = RiskSchema.partial().parse(request.body);
    const risk = await prisma.risk.update({
      where: { id: request.params.id },
      data: body,
    });
    return { data: risk };
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await prisma.risk.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}
