import type { PrismaClient } from '@prisma/client';
import { FieldOpsAI } from '@fieldops/ai-client';
import type { WorkTypeId } from '@fieldops/types';

interface AIJobData {
  tenantId: string;
  type: 'regulatory' | 'risk-analysis';
  payload: Record<string, unknown>;
}

export async function processAIJob(data: AIJobData, prisma: PrismaClient) {
  const ai = new FieldOpsAI(process.env.ANTHROPIC_API_KEY!);

  if (data.type === 'regulatory') {
    const { state, workTypes, projectDescription, locality, projectId } = data.payload as {
      state: string;
      workTypes: WorkTypeId[];
      projectDescription?: string;
      locality?: string;
      projectId?: string;
    };

    const result = await ai.analyzeRegulations({ state, workTypes, projectDescription, locality });

    await prisma.regulatoryAnalysis.create({
      data: {
        projectId: projectId || null,
        state,
        locality: locality || null,
        workTypes,
        projectDescription: projectDescription || null,
        result: result as object,
      },
    });

    console.log(`[AI] Regulatory analysis complete for ${state}`);
  }

  if (data.type === 'risk-analysis') {
    const { projectId, projectSummary } = data.payload as {
      projectId: string;
      projectSummary: string;
    };

    const risks = await ai.analyzeProjectRisks(projectSummary);

    // Bulk create suggested risks
    for (const risk of risks) {
      await prisma.risk.create({
        data: {
          projectId,
          title: risk.title,
          category: 'Technical',
          probability: risk.probability,
          impact: risk.impact,
          status: 'Open',
          mitigation: risk.mitigation,
          owner: 'Unassigned',
        },
      });
    }

    console.log(`[AI] Risk analysis complete: ${risks.length} risks created`);
  }
}
