import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth, requirePlan } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const WORK_TYPE_CONTEXT: Record<string, string> = {
  network_cabling: 'structured network cabling (Cat5e/6/6A, IDF/MDF, plenum)',
  trenching: 'underground trenching/conduit (open-cut, boring, near utilities)',
  aerial_cable: 'aerial cable on utility poles (strand-mount, NESC clearances, ROW)',
  fiber: 'fiber optic ISP/OSP (splicing, OTDR, underground and aerial runs)',
  access_control: 'electronic access control (controllers, mag-locks, card readers)',
  surveillance: 'video surveillance/CCTV (IP cameras, NVR, PoE, audio, LPR)',
};

const WORK_TYPE_LABELS: Record<string, string> = {
  network_cabling: 'Network Cabling',
  trenching: 'Trenching',
  aerial_cable: 'Aerial Cable',
  fiber: 'Fiber Optic',
  access_control: 'Access Control',
  surveillance: 'Surveillance/CCTV',
};

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

async function analyzeRegulations(params: {
  state: string;
  workTypes: string[];
  projectDescription?: string;
  locality?: string;
}) {
  const wtLabels = params.workTypes
    .map(id => `${WORK_TYPE_LABELS[id]} (${WORK_TYPE_CONTEXT[id]})`)
    .join('; ');

  const sys =
    'You are a compliance expert for MSP and low-voltage contractors in the United States. ' +
    'Output ONLY raw valid JSON. No markdown fences, no prose. Start with { end with }. ' +
    'severity must be exactly: Critical, High, or Medium. ' +
    'applicableWorkTypes must only use IDs: network_cabling, trenching, aerial_cable, fiber, access_control, surveillance.';

  const usr =
    `State: ${params.state}${params.locality ? ` (locality: ${params.locality})` : ''}\n` +
    `Work types: ${wtLabels}\n` +
    `Project: ${params.projectDescription || 'General installation'}\n\n` +
    'Return JSON with keys: summary, federalRequirements [{title,authority,description,applicableWorkTypes,severity,action}], ' +
    'stateRequirements [{title,authority,description,applicableWorkTypes,severity,licenseRequired,licenseName,action}], ' +
    'permits [{permitName,issuingAuthority,applicableWorkTypes,typicalLeadTime,estimatedCost,notes,severity}], ' +
    'localConsiderations [{title,description,applicableWorkTypes}], ' +
    'riskFlags [{title,description,applicableWorkTypes,probability,impact,mitigation}], ' +
    'recommendedActions [string].';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: sys,
      messages: [{ role: 'user', content: usr }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }>; stop_reason: string };
  if (data.stop_reason === 'max_tokens') {
    throw new Error('Response cut off — try fewer work types.');
  }

  const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON in response');
  return JSON.parse(raw.slice(start, end + 1));
}

export async function regulatoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.post('/analyze', {
    preHandler: requirePlan('growth', 'enterprise'),
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = AnalyzeSchema.parse(request.body);

    const result = await analyzeRegulations({
      state: body.state,
      workTypes: body.workTypes,
      projectDescription: body.projectDescription,
      locality: body.locality,
    });

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

  app.get('/history', async (request, reply) => {
    const analyses = await prisma.regulatoryAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { data: analyses };
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const analysis = await prisma.regulatoryAnalysis.findFirst({
      where: { id: request.params.id },
    });
    if (!analysis) return reply.status(404).send({ error: 'Not found' });
    return { data: analysis };
  });
}

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
