import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  status: z.enum(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']).optional(),
  budget: z.number().min(0).optional(),
  spent: z.number().min(0).optional(),
  phase: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

const UpdateProjectSchema = CreateProjectSchema.partial();

export async function projectRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook('preHandler', requireAuth);

  // GET /api/v1/projects
  app.get('/', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: projects };
  });

  // GET /api/v1/projects/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const project = await prisma.project.findFirst({
      where: { id: request.params.id },
      include: {
        risks: true,
        phases: true,
        procurement: true,
        checklist: true,
      },
    });
    if (!project) return reply.status(404).send({ error: 'Not found' });
    return { data: project };
  });

  // POST /api/v1/projects
  app.post('/', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = CreateProjectSchema.parse(request.body);
    const project = await prisma.project.create({
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    return reply.status(201).send({ data: project });
  });

  // PATCH /api/v1/projects/:id
  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = UpdateProjectSchema.parse(request.body);
    const project = await prisma.project.update({
      where: { id: request.params.id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    return { data: project };
  });

  // DELETE /api/v1/projects/:id
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await prisma.project.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}
