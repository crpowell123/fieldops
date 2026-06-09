import Anthropic from '@anthropic-ai/sdk';
import type {
  WorkTypeId,
  RegulatoryResult,
} from '@fieldops/types';

export const WORK_TYPE_CONTEXT: Record<WorkTypeId, string> = {
  network_cabling: 'structured network cabling (Cat5e/6/6A, IDF/MDF, plenum, fire-rated penetrations)',
  trenching: 'underground trenching/conduit (open-cut, boring, excavation near utilities)',
  aerial_cable: 'aerial cable on utility poles (strand-mount, make-ready, NESC clearances, ROW)',
  fiber: 'fiber optic ISP/OSP (splicing, OTDR, underground and aerial runs)',
  access_control: 'electronic access control (controllers, mag-locks, card readers, biometrics)',
  surveillance: 'video surveillance/CCTV (IP cameras, NVR, PoE, audio, LPR)',
};

export const WORK_TYPE_LABELS: Record<WorkTypeId, string> = {
  network_cabling: 'Network Cabling',
  trenching: 'Trenching',
  aerial_cable: 'Aerial Cable',
  fiber: 'Fiber Optic',
  access_control: 'Access Control',
  surveillance: 'Surveillance/CCTV',
};

export class FieldOpsAI {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  // ── REGULATORY ANALYSIS ───────────────────────────────────────────────────

  async analyzeRegulations(params: {
    state: string;
    workTypes: WorkTypeId[];
    projectDescription?: string;
    locality?: string;
  }): Promise<RegulatoryResult> {
    const wtLabels = params.workTypes
      .map(id => `${WORK_TYPE_LABELS[id]} (${WORK_TYPE_CONTEXT[id]})`)
      .join('; ');

    const systemPrompt =
      'You are a compliance expert for MSP and low-voltage contractors in the United States. ' +
      'Output ONLY raw valid JSON with no markdown, no prose. Start with { end with }. ' +
      'severity values: Critical, High, or Medium only. ' +
      'applicableWorkTypes IDs: network_cabling, trenching, aerial_cable, fiber, access_control, surveillance.';

    const userPrompt =
      `State: ${params.state}${params.locality ? ` (locality: ${params.locality})` : ''}\n` +
      `Work types: ${wtLabels}\n` +
      `Project: ${params.projectDescription || 'General installation'}\n\n` +
      'Return JSON with keys: summary (string), ' +
      'federalRequirements [{title,authority,description,applicableWorkTypes,severity,action}], ' +
      'stateRequirements [{title,authority,description,applicableWorkTypes,severity,licenseRequired,licenseName,action}], ' +
      'permits [{permitName,issuingAuthority,applicableWorkTypes,typicalLeadTime,estimatedCost,notes,severity}], ' +
      'localConsiderations [{title,description,applicableWorkTypes}], ' +
      'riskFlags [{title,description,applicableWorkTypes,probability,impact,mitigation}], ' +
      'recommendedActions [string]. ' +
      'Use real regulations: actual license names, NEC articles, OSHA 29 CFR, 811, state privacy laws.';

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (message.stop_reason === 'max_tokens') {
      throw new Error('Response cut off — try fewer work types or add a project description.');
    }

    const raw = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new Error(`No JSON in AI response. Preview: ${raw.slice(0, 200)}`);
    }

    return JSON.parse(raw.slice(start, end + 1)) as RegulatoryResult;
  }

  // ── PROJECT INTELLIGENCE ──────────────────────────────────────────────────

  async askAboutProject(params: {
    question: string;
    projectContext: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<string> {
    const systemPrompt =
      'You are an intelligent assistant embedded in FieldOps, an MSP project management platform. ' +
      'Help project managers analyze projects, prioritize work, estimate budgets, ' +
      'draft client updates, and surface risks. Be concise and specific. ' +
      `Current project context: ${params.projectContext}`;

    const messages = [
      ...params.conversationHistory,
      { role: 'user' as const, content: params.question },
    ];

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    });

    return response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');
  }

  // ── RISK ANALYSIS ─────────────────────────────────────────────────────────

  async analyzeProjectRisks(projectSummary: string): Promise<Array<{
    title: string;
    probability: number;
    impact: number;
    mitigation: string;
  }>> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'You are a risk analyst for MSP IT projects. Output only raw JSON array. No markdown.',
      messages: [{
        role: 'user',
        content: `Analyze this project and identify the top 5 risks. Return JSON array of {title,probability(1-5),impact(1-5),mitigation}.\n\nProject: ${projectSummary}`,
      }],
    });

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end <= start) return [];
    return JSON.parse(raw.slice(start, end + 1));
  }
}
