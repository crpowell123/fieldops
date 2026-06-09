import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth, requireRole } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const CreateEngineerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.string().min(1).max(200),
  avatarUrl: z.string().url().optional().nullable(),
  color: z.string().optional(),
  capacityHoursPerWeek: z.number().min(1).max(80).optional(),
});

const UpdateEngineerSchema = CreateEngineerSchema.partial();

export async function engineerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const engineers = await prisma.engineer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return { data: engineers };
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const engineer = await prisma.engineer.findFirst({
      where: { id: request.params.id },
      include: {
        allocations: { include: { project: true } },
        spans: { include: { project: true } },
      },
    });
    if (!engineer) return reply.status(404).send({ error: 'Not found' });
    return { data: engineer };
  });

  app.post('/', {
    preHandler: requireRole('owner', 'admin'),
  }, async (request, reply) => {
    const body = CreateEngineerSchema.parse(request.body);
    const engineer = await prisma.engineer.create({ data: body });
    return reply.status(201).send({ data: engineer });
  });

  app.patch<{ Params: { id: string } }>('/:id', {
    preHandler: requireRole('owner', 'admin'),
  }, async (request, reply) => {
    const body = UpdateEngineerSchema.parse(request.body);
    const engineer = await prisma.engineer.update({
      where: { id: request.params.id },
      data: body,
    });
    return { data: engineer };
  });

  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: requireRole('owner', 'admin'),
  }, async (request, reply) => {
    await prisma.engineer.update({
      where: { id: request.params.id },
      data: { isActive: false },
    });
    return reply.status(204).send();
  });
}
