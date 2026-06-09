// ConnectWise PSA REST API client
// Docs: https://developer.connectwise.com/Products/Manage/REST

export interface CWConfig {
  companyId: string;
  site: string;         // e.g. na.myconnectwise.net
  publicKey: string;
  privateKey: string;
  clientId: string;
}

export interface CWProject {
  id: number;
  name: string;
  status: { id: number; name: string };
  company: { id: number; name: string };
  estimatedStart: string;
  estimatedEnd: string;
  actualStart: string | null;
  budget: number | null;
  actualHours: number | null;
  percentComplete: number;
  manager: { id: number; name: string } | null;
  billingMethod: string;
}

export interface CWMember {
  id: number;
  identifier: string;
  firstName: string;
  lastName: string;
  title: string | null;
  primaryEmail: string;
  photo: { id: number } | null;
}

export interface CWTicket {
  id: number;
  summary: string;
  status: { id: number; name: string };
  priority: { id: number; name: string };
  assignedTo: { id: number; name: string } | null;
  project: { id: number; name: string } | null;
  actualHours: number | null;
  budgetHours: number | null;
  dateEntered: string;
  dateResolved: string | null;
}

export class ConnectWiseClient {
  private baseUrl: string;
  private authHeader: string;
  private clientId: string;

  constructor(config: CWConfig) {
    this.baseUrl = `https://${config.site}/v4_6_release/apis/3.0`;
    const token = Buffer.from(
      `${config.companyId}+${config.publicKey}:${config.privateKey}`
    ).toString('base64');
    this.authHeader = `Basic ${token}`;
    this.clientId = config.clientId;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'clientId': this.clientId,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CW API error ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  // ── PROJECTS ──────────────────────────────────────────────────────────────

  async getProjects(page = 1, pageSize = 100): Promise<CWProject[]> {
    return this.fetch<CWProject[]>(
      `/project/projects?page=${page}&pageSize=${pageSize}&orderBy=name`
    );
  }

  async getProject(id: number): Promise<CWProject> {
    return this.fetch<CWProject>(`/project/projects/${id}`);
  }

  async getProjectCount(): Promise<number> {
    const res = await this.fetch<{ count: number }>('/project/projects/count');
    return res.count;
  }

  async getAllProjects(): Promise<CWProject[]> {
    const pageSize = 100;
    const total = await this.getProjectCount();
    const pages = Math.ceil(total / pageSize);
    const results = await Promise.all(
      Array.from({ length: pages }, (_, i) => this.getProjects(i + 1, pageSize))
    );
    return results.flat();
  }

  // ── MEMBERS ───────────────────────────────────────────────────────────────

  async getMembers(page = 1, pageSize = 100): Promise<CWMember[]> {
    return this.fetch<CWMember[]>(
      `/system/members?page=${page}&pageSize=${pageSize}&conditions=inactiveFlag=false`
    );
  }

  async getMember(id: number): Promise<CWMember> {
    return this.fetch<CWMember>(`/system/members/${id}`);
  }

  // ── TICKETS / SERVICE ─────────────────────────────────────────────────────

  async getTickets(projectId?: number, page = 1, pageSize = 100): Promise<CWTicket[]> {
    const conditions = projectId ? `project/id=${projectId}` : '';
    const query = conditions ? `&conditions=${encodeURIComponent(conditions)}` : '';
    return this.fetch<CWTicket[]>(
      `/service/tickets?page=${page}&pageSize=${pageSize}${query}`
    );
  }

  async getTicketCount(projectId?: number): Promise<number> {
    const conditions = projectId ? `?conditions=project/id=${projectId}` : '';
    const res = await this.fetch<{ count: number }>(`/service/tickets/count${conditions}`);
    return res.count;
  }

  // ── PROJECT PHASES ────────────────────────────────────────────────────────

  async getProjectPhases(projectId: number): Promise<Array<{
    id: number;
    description: string;
    scheduledStart: string;
    scheduledEnd: string;
    actualStart: string | null;
    actualEnd: string | null;
    status: { name: string };
  }>> {
    return this.fetch(`/project/projects/${projectId}/phases`);
  }

  // ── VALIDATE CREDENTIALS ──────────────────────────────────────────────────

  async validateCredentials(): Promise<boolean> {
    try {
      await this.fetch('/system/info');
      return true;
    } catch {
      return false;
    }
  }

  async getSystemInfo(): Promise<{
    version: string;
    companyName: string;
    codeLevel: string;
  }> {
    return this.fetch('/system/info');
  }
}
