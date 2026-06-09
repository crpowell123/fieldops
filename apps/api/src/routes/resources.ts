import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';

const AllocationSchema = z.object({
  engineerId: z.string(),
  projectId: z.string(),
  hoursPerWeek: z.number().min(1).max(80),
  role: z.string().min(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

const SpanSchema = z.object({
  engineerId: z.string(),
  projectId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  hoursPerDay: z.number().min(1).max(16),
  role: z.string().min(1),
});

const UpdateSpanSchema = SpanSchema.partial();

export async function resourceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // ── ALLOCATIONS ────────────────────────────────────────────────────────────

  app.get('/allocations', async () => {
    const allocs = await prisma.resourceAllocation.findMany({
      include: { engineer: true, project: true },
    });
    return { data: allocs };
  });

  app.post('/allocations', async (request, reply) => {
    const body = AllocationSchema.parse(request.body);
    const alloc = await prisma.resourceAllocation.create({
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
      include: { engineer: true, project: true },
    });
    return reply.status(201).send({ data: alloc });
  });

  app.patch<{ Params: { id: string } }>('/allocations/:id', async (request, reply) => {
    const body = AllocationSchema.partial().parse(request.body);
    const alloc = await prisma.resourceAllocation.update({
      where: { id: request.params.id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    return { data: alloc };
  });

  app.delete<{ Params: { id: string } }>('/allocations/:id', async (request, reply) => {
    await prisma.resourceAllocation.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });

  // ── SPANS ──────────────────────────────────────────────────────────────────

  app.get('/spans', async () => {
    const spans = await prisma.resourceSpan.findMany({
      include: { engineer: true, project: true },
      orderBy: { startDate: 'asc' },
    });
    return { data: spans };
  });

  app.post('/spans', async (request, reply) => {
    const body = SpanSchema.parse(request.body);
    const span = await prisma.resourceSpan.create({
      data: {
        ...body,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
      include: { engineer: true, project: true },
    });
    return reply.status(201).send({ data: span });
  });

  app.patch<{ Params: { id: string } }>('/spans/:id', async (request, reply) => {
    const body = UpdateSpanSchema.parse(request.body);
    const span = await prisma.resourceSpan.update({
      where: { id: request.params.id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    return { data: span };
  });

  app.delete<{ Params: { id: string } }>('/spans/:id', async (request, reply) => {
    await prisma.resourceSpan.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}
