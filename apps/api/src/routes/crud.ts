import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth, requireRole } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

// ── LESSONS ───────────────────────────────────────────────────────────────────

const LessonSchema = z.object({
  projectId: z.string(),
  date: z.string(),
  category: z.enum(['Planning','Technical','Communication','Vendor','Security','Scope']),
  what: z.string().min(1),
  impact: z.enum(['Positive','Negative','Neutral']),
  recommendation: z.string().min(1),
  addedByName: z.string(),
});

export async function lessonRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async () => {
    const lessons = await prisma.lesson.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: lessons };
  });

  app.post('/', async (request, reply) => {
    const body = LessonSchema.parse(request.body);
    const lesson = await prisma.lesson.create({
      data: { ...body, date: new Date(body.date) },
    });
    return reply.status(201).send({ data: lesson });
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await prisma.lesson.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}

// ── SCHEDULE ──────────────────────────────────────────────────────────────────

const PhaseSchema = z.object({
  projectId: z.string(),
  phase: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['Upcoming','In Progress','Done','Delayed']).optional(),
  owner: z.string(),
  dependencies: z.array(z.string()).optional(),
  isMilestone: z.boolean().optional(),
});

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const { projectId } = request.query as { projectId?: string };
    const phases = await prisma.schedulePhase.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { startDate: 'asc' },
    });
    return { data: phases };
  });

  app.post('/', async (request, reply) => {
    const body = PhaseSchema.parse(request.body);
    const phase = await prisma.schedulePhase.create({
      data: {
        ...body,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        dependencies: body.dependencies || [],
      },
    });
    return reply.status(201).send({ data: phase });
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = PhaseSchema.partial().parse(request.body);
    const phase = await prisma.schedulePhase.update({
      where: { id: request.params.id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    return { data: phase };
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await prisma.schedulePhase.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}

// ── PROCUREMENT ───────────────────────────────────────────────────────────────

const ProcurementSchema = z.object({
  projectId: z.string(),
  item: z.string().min(1),
  vendor: z.string(),
  qty: z.number().min(1),
  unitCost: z.number().min(0),
  status: z.enum(['Pending PO','On Order','In Transit','Delivered','Provisioned','Backordered']).optional(),
  orderedAt: z.string().optional().nullable(),
  eta: z.string().optional().nullable(),
  poNumber: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function procurementRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const { projectId } = request.query as { projectId?: string };
    const items = await prisma.procurementItem.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: 'desc' },
    });
    return { data: items };
  });

  app.post('/', async (request, reply) => {
    const body = ProcurementSchema.parse(request.body);
    const item = await prisma.procurementItem.create({
      data: {
        ...body,
        orderedAt: body.orderedAt ? new Date(body.orderedAt) : null,
        eta: body.eta ? new Date(body.eta) : null,
      },
    });
    return reply.status(201).send({ data: item });
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = ProcurementSchema.partial().parse(request.body);
    const item = await prisma.procurementItem.update({
      where: { id: request.params.id },
      data: {
        ...body,
        orderedAt: body.orderedAt ? new Date(body.orderedAt) : undefined,
        eta: body.eta ? new Date(body.eta) : undefined,
      },
    });
    return { data: item };
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await prisma.procurementItem.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}

// ── CHECKLIST ─────────────────────────────────────────────────────────────────

const ChecklistSchema = z.object({
  projectId: z.string(),
  category: z.enum(['Tools','Materials','Docs','Access','Safety']),
  item: z.string().min(1),
  checked: z.boolean().optional(),
  assigneeName: z.string(),
  notes: z.string().optional(),
});

export async function checklistRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const { projectId } = request.query as { projectId?: string };
    const items = await prisma.checklistItem.findMany({
      where: projectId ? { projectId } : {},
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    });
    return { data: items };
  });

  app.post('/', async (request, reply) => {
    const body = ChecklistSchema.parse(request.body);
    const item = await prisma.checklistItem.create({ data: body });
    return reply.status(201).send({ data: item });
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = ChecklistSchema.partial().parse(request.body);
    const item = await prisma.checklistItem.update({
      where: { id: request.params.id },
      data: body,
    });
    return { data: item };
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await prisma.checklistItem.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}

// ── TENANTS ───────────────────────────────────────────────────────────────────

export async function tenantRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET current tenant
  app.get('/me', async (request) => {
    const req = request as AuthenticatedRequest;
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      include: { users: true },
    });
    return { data: tenant };
  });

  // PATCH tenant name/slug
  app.patch('/me', {
    preHandler: requireRole('owner', 'admin'),
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = z.object({
      name: z.string().min(1).optional(),
    }).parse(request.body);
    const tenant = await prisma.tenant.update({
      where: { id: req.tenantId },
      data: body,
    });
    return { data: tenant };
  });

  // GET tenant members
  app.get('/me/members', async (request) => {
    const req = request as AuthenticatedRequest;
    const members = await prisma.tenantUser.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    return { data: members };
  });

  // PATCH member role
  app.patch<{ Params: { userId: string } }>('/me/members/:userId', {
    preHandler: requireRole('owner'),
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { role } = z.object({ role: z.enum(['admin','member','viewer']) }).parse(request.body);
    const member = await prisma.tenantUser.update({
      where: { id: request.params.userId },
      data: { role },
    });
    return { data: member };
  });
}
