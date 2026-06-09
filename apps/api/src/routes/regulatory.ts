import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth, requirePlan } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { FieldOpsAI } from '@fieldops/ai-client';

const AnalyzeSchema = z.object({
  state: z.string().min(2),
  workTypes: z.array(z.enum([
    'network_cabling', 'trenching', 'aerial_cable',
    'fiber', 'access_control', 'surveillance',
  ])).min(1),
  projectDescription: z.string().optional(),
  locality: z.string().optional(),
  projectId: z.string().optional(),
});

export async function regulatoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // POST /api/v1/regulatory/analyze
  app.post('/analyze', {
    preHandler: requirePlan('growth', 'enterprise'),
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = AnalyzeSchema.parse(request.body);

    const ai = new FieldOpsAI(process.env.ANTHROPIC_API_KEY!);

    const result = await ai.analyzeRegulations({
      state: body.state,
      workTypes: body.workTypes,
      projectDescription: body.projectDescription,
      locality: body.locality,
    });

    // Persist the analysis
    const analysis = await prisma.regulatoryAnalysis.create({
      data: {
        projectId: body.projectId || null,
        state: body.state,
        locality: body.locality || null,
        workTypes: body.workTypes,
        projectDescription: body.projectDescription || null,
        result: result as object,
      },
    });

    return reply.status(201).send({ data: { id: analysis.id, ...result } });
  });

  // GET /api/v1/regulatory/history
  app.get('/history', async (request, reply) => {
    const analyses = await prisma.regulatoryAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { data: analyses };
  });

  // GET /api/v1/regulatory/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const analysis = await prisma.regulatoryAnalysis.findFirst({
      where: { id: request.params.id },
    });
    if (!analysis) return reply.status(404).send({ error: 'Not found' });
    return { data: analysis };
  });
}
