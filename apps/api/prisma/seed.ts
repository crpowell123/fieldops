import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding FieldOps demo data...');

  // ── CLEAN EXISTING DATA ────────────────────────────────────────────────────
  await prisma.checklistItem.deleteMany();
  await prisma.procurementItem.deleteMany();
  await prisma.schedulePhase.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.regulatoryAnalysis.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.resourceSpan.deleteMany();
  await prisma.resourceAllocation.deleteMany();
  await prisma.engineer.deleteMany();
  await prisma.project.deleteMany();

  console.log('✓ Cleared existing data');

  // ── ENGINEERS ──────────────────────────────────────────────────────────────
  const engineers = await Promise.all([
    prisma.engineer.create({ data: {
      cwMemberId: 'cw-101',
      name: 'Jordan Kim',
      email: 'jordan.kim@sunstack.com',
      role: 'Senior Network Engineer',
      color: '#6366f1',
      capacityHoursPerWeek: 40,
      isActive: true,
    }}),
    prisma.engineer.create({ data: {
      cwMemberId: 'cw-102',
      name: 'Alex Rivera',
      email: 'alex.rivera@sunstack.com',
      role: 'Systems Engineer',
      color: '#f59e0b',
      capacityHoursPerWeek: 40,
      isActive: true,
    }}),
    prisma.engineer.create({ data: {
      cwMemberId: 'cw-103',
      name: 'Sam Patel',
      email: 'sam.patel@sunstack.com',
      role: 'Security Specialist',
      color: '#10b981',
      capacityHoursPerWeek: 40,
      isActive: true,
    }}),
    prisma.engineer.create({ data: {
      cwMemberId: 'cw-104',
      name: 'Taylor Chen',
      email: 'taylor.chen@sunstack.com',
      role: 'Cloud Architect',
      color: '#ef4444',
      capacityHoursPerWeek: 40,
      isActive: true,
    }}),
    prisma.engineer.create({ data: {
      cwMemberId: 'cw-105',
      name: 'Morgan Lee',
      email: 'morgan.lee@sunstack.com',
      role: 'Project Coordinator',
      color: '#8b5cf6',
      capacityHoursPerWeek: 40,
      isActive: true,
    }}),
  ]);

  const [jordan, alex, sam, taylor, morgan] = engineers;
  console.log(`✓ Created ${engineers.length} engineers`);

  // ── PROJECTS ───────────────────────────────────────────────────────────────
  const projects = await Promise.all([
    prisma.project.create({ data: {
      cwProjectId: 'CW-1001',
      name: 'Network Infrastructure Upgrade',
      company: 'Acme Corp',
      status: 'In Progress',
      budget: 48000,
      spent: 31200,
      phase: 'Implementation',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      description: 'Full network refresh including core switching, routing, and wireless infrastructure across 3 floors.',
    }}),
    prisma.project.create({ data: {
      cwProjectId: 'CW-1002',
      name: 'Microsoft 365 Migration',
      company: 'GlobalTech Inc',
      status: 'Planning',
      budget: 22000,
      spent: 3400,
      phase: 'Discovery',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-07-15'),
      description: 'Migrate 120 users from on-premise Exchange to Microsoft 365 Business Premium including Teams deployment.',
    }}),
    prisma.project.create({ data: {
      cwProjectId: 'CW-1003',
      name: 'Security Audit & Remediation',
      company: 'Riverside Medical',
      status: 'On Hold',
      budget: 35000,
      spent: 18900,
      phase: 'Assessment',
      startDate: new Date('2026-03-15'),
      endDate: new Date('2026-08-01'),
      description: 'HIPAA compliance audit, vulnerability scanning, and remediation for 3 clinic locations.',
    }}),
    prisma.project.create({ data: {
      cwProjectId: 'CW-1004',
      name: 'VoIP System Deployment',
      company: 'Harbor Logistics',
      status: 'Completed',
      budget: 15500,
      spent: 15100,
      phase: 'Closed',
      startDate: new Date('2026-01-10'),
      endDate: new Date('2026-05-01'),
      description: 'Replace legacy PBX with cloud VoIP solution across 2 warehouse locations, 45 extensions.',
    }}),
    prisma.project.create({ data: {
      cwProjectId: 'CW-1005',
      name: 'SD-WAN Implementation',
      company: 'Pacific Retail Group',
      status: 'Planning',
      budget: 62000,
      spent: 4200,
      phase: 'Design',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-09-30'),
      description: 'Deploy SD-WAN across 8 retail locations replacing MPLS circuits. Includes failover LTE connectivity.',
    }}),
  ]);

  const [acme, globaltech, riverside, harbor, pacific] = projects;
  console.log(`✓ Created ${projects.length} projects`);

  // ── RESOURCE ALLOCATIONS ───────────────────────────────────────────────────
  await Promise.all([
    prisma.resourceAllocation.create({ data: { engineerId: jordan.id, projectId: acme.id,      hoursPerWeek: 24, role: 'Lead Engineer'   }}),
    prisma.resourceAllocation.create({ data: { engineerId: jordan.id, projectId: globaltech.id, hoursPerWeek: 8,  role: 'Consultant'      }}),
    prisma.resourceAllocation.create({ data: { engineerId: alex.id,   projectId: acme.id,      hoursPerWeek: 16, role: 'Network Tech'    }}),
    prisma.resourceAllocation.create({ data: { engineerId: sam.id,    projectId: riverside.id,  hoursPerWeek: 32, role: 'Lead Auditor'    }}),
    prisma.resourceAllocation.create({ data: { engineerId: taylor.id, projectId: globaltech.id, hoursPerWeek: 28, role: 'Cloud Architect' }}),
    prisma.resourceAllocation.create({ data: { engineerId: taylor.id, projectId: pacific.id,    hoursPerWeek: 10, role: 'Solutions Arch'  }}),
    prisma.resourceAllocation.create({ data: { engineerId: morgan.id, projectId: acme.id,      hoursPerWeek: 10, role: 'Coordinator'     }}),
    prisma.resourceAllocation.create({ data: { engineerId: morgan.id, projectId: riverside.id,  hoursPerWeek: 8,  role: 'Coordinator'     }}),
  ]);
  console.log('✓ Created resource allocations');

  // ── RESOURCE SPANS ─────────────────────────────────────────────────────────
  await Promise.all([
    prisma.resourceSpan.create({ data: { engineerId: jordan.id, projectId: acme.id,      startDate: new Date('2026-05-19'), endDate: new Date('2026-06-13'), hoursPerDay: 5, role: 'Lead Engineer'   }}),
    prisma.resourceSpan.create({ data: { engineerId: jordan.id, projectId: globaltech.id, startDate: new Date('2026-06-16'), endDate: new Date('2026-07-10'), hoursPerDay: 2, role: 'Consultant'      }}),
    prisma.resourceSpan.create({ data: { engineerId: alex.id,   projectId: acme.id,      startDate: new Date('2026-05-19'), endDate: new Date('2026-06-06'), hoursPerDay: 4, role: 'Network Tech'    }}),
    prisma.resourceSpan.create({ data: { engineerId: sam.id,    projectId: riverside.id,  startDate: new Date('2026-05-26'), endDate: new Date('2026-07-17'), hoursPerDay: 7, role: 'Lead Auditor'    }}),
    prisma.resourceSpan.create({ data: { engineerId: taylor.id, projectId: globaltech.id, startDate: new Date('2026-05-19'), endDate: new Date('2026-07-10'), hoursPerDay: 6, role: 'Cloud Architect' }}),
    prisma.resourceSpan.create({ data: { engineerId: morgan.id, projectId: acme.id,      startDate: new Date('2026-05-26'), endDate: new Date('2026-06-20'), hoursPerDay: 2, role: 'Coordinator'     }}),
    prisma.resourceSpan.create({ data: { engineerId: morgan.id, projectId: riverside.id,  startDate: new Date('2026-06-01'), endDate: new Date('2026-07-03'), hoursPerDay: 2, role: 'Coordinator'     }}),
  ]);
  console.log('✓ Created resource spans');

  // ── RISKS ──────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.risk.create({ data: {
      projectId: acme.id,
      title: 'Vendor hardware delay — Cisco lead times',
      category: 'Supply Chain',
      probability: 4, impact: 5,
      status: 'Open',
      mitigation: 'Order placed with 6-week buffer. Alternate vendor (Dell EMC) identified and quoted. PO approved.',
      linkedProposal: 'Phase 2 Hardware Proposal',
      owner: 'Jordan Kim',
      raisedAt: new Date('2026-04-10'),
    }}),
    prisma.risk.create({ data: {
      projectId: acme.id,
      title: 'Scope creep — client requesting wireless APs not in SOW',
      category: 'Scope',
      probability: 3, impact: 3,
      status: 'Watching',
      mitigation: 'Change control process in place. PM sign-off required for any out-of-scope work. Client informed.',
      linkedProposal: '',
      owner: 'Morgan Lee',
      raisedAt: new Date('2026-04-22'),
    }}),
    prisma.risk.create({ data: {
      projectId: globaltech.id,
      title: 'Microsoft 365 license count mismatch',
      category: 'Commercial',
      probability: 2, impact: 4,
      status: 'Open',
      mitigation: 'Re-audit active users before migration window. Confirm with HR on headcount changes.',
      linkedProposal: 'M365 Add-on License Quote',
      owner: 'Taylor Chen',
      raisedAt: new Date('2026-05-05'),
    }}),
    prisma.risk.create({ data: {
      projectId: riverside.id,
      title: 'Ransomware incident during audit window',
      category: 'Security',
      probability: 1, impact: 5,
      status: 'Accepted',
      mitigation: 'Snapshot all VMs nightly during engagement. IR playbook on standby. Client CISO briefed.',
      linkedProposal: '',
      owner: 'Sam Patel',
      raisedAt: new Date('2026-03-20'),
    }}),
    prisma.risk.create({ data: {
      projectId: riverside.id,
      title: 'Client staff availability for interview windows',
      category: 'Resource',
      probability: 4, impact: 3,
      status: 'Open',
      mitigation: 'Schedule confirmed 2 weeks in advance. Escalation path to clinic director defined.',
      linkedProposal: '',
      owner: 'Morgan Lee',
      raisedAt: new Date('2026-04-01'),
    }}),
    prisma.risk.create({ data: {
      projectId: pacific.id,
      title: 'ISP circuit provisioning delays at remote sites',
      category: 'Vendor',
      probability: 4, impact: 4,
      status: 'Open',
      mitigation: 'Submit ISP orders 90 days ahead of deployment. LTE failover as bridge solution.',
      linkedProposal: 'LTE Bridge Service Quote',
      owner: 'Taylor Chen',
      raisedAt: new Date('2026-05-20'),
    }}),
    prisma.risk.create({ data: {
      projectId: acme.id,
      title: 'Cutover window too short — risk of incomplete migration',
      category: 'Technical',
      probability: 3, impact: 4,
      status: 'Watching',
      mitigation: 'Dry-run scheduled 2 weeks before go-live. Rollback plan documented and tested.',
      linkedProposal: '',
      owner: 'Jordan Kim',
      raisedAt: new Date('2026-05-12'),
    }}),
  ]);
  console.log('✓ Created risks');

  // ── LESSONS LEARNED ────────────────────────────────────────────────────────
  await Promise.all([
    prisma.lesson.create({ data: {
      projectId: harbor.id,
      date: new Date('2026-05-02'),
      category: 'Planning',
      what: 'Underestimated physical cabling labour by 30% due to no site survey before quoting',
      impact: 'Negative',
      recommendation: 'Mandatory site survey before any cabling quote. Add 25% labour contingency for first-visit physical work.',
      addedByName: 'Jordan Kim',
    }}),
    prisma.lesson.create({ data: {
      projectId: harbor.id,
      date: new Date('2026-04-28'),
      category: 'Communication',
      what: 'Weekly status email digest significantly improved client satisfaction scores',
      impact: 'Positive',
      recommendation: 'Standardise weekly digest template across all active projects. Send every Friday at 4pm.',
      addedByName: 'Morgan Lee',
    }}),
    prisma.lesson.create({ data: {
      projectId: acme.id,
      date: new Date('2026-05-10'),
      category: 'Technical',
      what: 'VLAN misconfiguration caused 4-hour network outage during cutover',
      impact: 'Negative',
      recommendation: 'Mandatory dry-run in isolated test environment before live cutover. Rollback plan must be approved by client before change window opens.',
      addedByName: 'Alex Rivera',
    }}),
    prisma.lesson.create({ data: {
      projectId: globaltech.id,
      date: new Date('2026-05-14'),
      category: 'Vendor',
      what: 'Microsoft CSP portal took 48 hours to provision new tenant instead of expected 2 hours',
      impact: 'Negative',
      recommendation: 'Submit tenant provisioning requests minimum 72 hours before migration date. Build buffer into all M365 project timelines.',
      addedByName: 'Taylor Chen',
    }}),
    prisma.lesson.create({ data: {
      projectId: harbor.id,
      date: new Date('2026-04-15'),
      category: 'Planning',
      what: 'Parallel phased cutover approach reduced client downtime to under 2 hours vs estimated 6',
      impact: 'Positive',
      recommendation: 'Use phased parallel cutover as standard approach for VoIP migrations. Document as reusable runbook.',
      addedByName: 'Jordan Kim',
    }}),
    prisma.lesson.create({ data: {
      projectId: riverside.id,
      date: new Date('2026-04-20'),
      category: 'Security',
      what: 'Client had 47 unpatched critical CVEs not disclosed in pre-engagement scoping call',
      impact: 'Negative',
      recommendation: 'Add mandatory pre-engagement vulnerability disclosure questionnaire to SOW process. Scope additional remediation time for medical clients.',
      addedByName: 'Sam Patel',
    }}),
  ]);
  console.log('✓ Created lessons learned');

  // ── SCHEDULE PHASES ────────────────────────────────────────────────────────
  await Promise.all([
    // Acme Corp - Network Upgrade
    prisma.schedulePhase.create({ data: { projectId: acme.id, phase: 'Discovery & Design',   startDate: new Date('2026-04-01'), endDate: new Date('2026-04-14'), status: 'Done',        owner: 'Jordan Kim',  dependencies: [],     isMilestone: false }}),
    prisma.schedulePhase.create({ data: { projectId: acme.id, phase: 'Procurement',           startDate: new Date('2026-04-10'), endDate: new Date('2026-04-30'), status: 'Done',        owner: 'Morgan Lee',  dependencies: [],     isMilestone: false }}),
    prisma.schedulePhase.create({ data: { projectId: acme.id, phase: 'Core Deployment',       startDate: new Date('2026-05-01'), endDate: new Date('2026-06-01'), status: 'In Progress', owner: 'Jordan Kim',  dependencies: [],     isMilestone: false }}),
    prisma.schedulePhase.create({ data: { projectId: acme.id, phase: 'User Acceptance Test',  startDate: new Date('2026-06-02'), endDate: new Date('2026-06-20'), status: 'Upcoming',    owner: 'Alex Rivera', dependencies: [],     isMilestone: false }}),
    prisma.schedulePhase.create({ data: { projectId: acme.id, phase: 'Go-Live',               startDate: new Date('2026-06-30'), endDate: new Date('2026-06-30'), status: 'Upcoming',    owner: 'Jordan Kim',  dependencies: [],     isMilestone: true  }}),
    // GlobalTech - M365
    prisma.schedulePhase.create({ data: { projectId: globaltech.id, phase: 'Tenant Provisioning', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-10'), status: 'Done',        owner: 'Taylor Chen', dependencies: [], isMilestone: false }}),
    prisma.schedulePhase.create({ data: { projectId: globaltech.id, phase: 'Mailbox Migration P1',startDate: new Date('2026-05-12'), endDate: new Date('2026-06-01'), status: 'In Progress', owner: 'Taylor Chen', dependencies: [], isMilestone: false }}),
    prisma.schedulePhase.create({ data: { projectId: globaltech.id, phase: 'Mailbox Migration P2',startDate: new Date('2026-06-03'), endDate: new Date('2026-06-28'), status: 'Upcoming',    owner: 'Taylor Chen', dependencies: [], isMilestone: false }}),
    prisma.schedulePhase.create({ data: { projectId: globaltech.id, phase: 'Cutover',             startDate: new Date('2026-07-15'), endDate: new Date('2026-07-15'), status: 'Upcoming',    owner: 'Taylor Chen', dependencies: [], isMilestone: true  }}),
  ]);
  console.log('✓ Created schedule phases');

  // ── PROCUREMENT ────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.procurementItem.create({ data: {
      projectId: acme.id,
      item: 'Cisco Catalyst 9300 48-port Stack (x3)',
      vendor: 'CDW',
      qty: 3, unitCost: 4200,
      status: 'Delivered',
      orderedAt: new Date('2026-04-12'),
      eta: new Date('2026-04-26'),
      poNumber: 'PO-2026-441',
      notes: '',
    }}),
    prisma.procurementItem.create({ data: {
      projectId: acme.id,
      item: 'Cisco ISR 4431 Router',
      vendor: 'Ingram Micro',
      qty: 2, unitCost: 3100,
      status: 'In Transit',
      orderedAt: new Date('2026-04-18'),
      eta: new Date('2026-05-20'),
      poNumber: 'PO-2026-442',
      notes: 'Delayed 3 days by carrier — tracking # 1Z9999W99999999999',
    }}),
    prisma.procurementItem.create({ data: {
      projectId: acme.id,
      item: 'Cat6A Cabling 1000ft (x5 reels)',
      vendor: 'Anixter',
      qty: 5, unitCost: 180,
      status: 'Delivered',
      orderedAt: new Date('2026-04-10'),
      eta: new Date('2026-04-16'),
      poNumber: 'PO-2026-440',
      notes: '',
    }}),
    prisma.procurementItem.create({ data: {
      projectId: acme.id,
      item: 'APC Smart-UPS 2200VA (x2)',
      vendor: 'CDW',
      qty: 2, unitCost: 650,
      status: 'On Order',
      orderedAt: new Date('2026-05-01'),
      eta: new Date('2026-05-22'),
      poNumber: 'PO-2026-455',
      notes: '',
    }}),
    prisma.procurementItem.create({ data: {
      projectId: globaltech.id,
      item: 'Microsoft 365 Business Premium (120 seats)',
      vendor: 'Microsoft CSP',
      qty: 120, unitCost: 22,
      status: 'Provisioned',
      orderedAt: new Date('2026-05-02'),
      eta: new Date('2026-05-04'),
      poNumber: 'PO-2026-450',
      notes: '',
    }}),
    prisma.procurementItem.create({ data: {
      projectId: riverside.id,
      item: 'Tenable Nessus Professional License',
      vendor: 'Tenable',
      qty: 1, unitCost: 2990,
      status: 'Pending PO',
      orderedAt: null,
      eta: new Date('2026-05-25'),
      poNumber: null,
      notes: 'Awaiting client PO approval — follow up with CFO',
    }}),
    prisma.procurementItem.create({ data: {
      projectId: pacific.id,
      item: 'Fortinet FortiGate 100F (x8 sites)',
      vendor: 'Fortinet',
      qty: 8, unitCost: 1850,
      status: 'Pending PO',
      orderedAt: null,
      eta: new Date('2026-07-01'),
      poNumber: null,
      notes: 'SOW not yet signed — hold until contract executed',
    }}),
    prisma.procurementItem.create({ data: {
      projectId: pacific.id,
      item: 'Cradlepoint E3000 LTE Router (x8)',
      vendor: 'Cradlepoint',
      qty: 8, unitCost: 890,
      status: 'Pending PO',
      orderedAt: null,
      eta: new Date('2026-07-01'),
      poNumber: null,
      notes: 'Failover LTE units — order with FortiGates',
    }}),
  ]);
  console.log('✓ Created procurement items');

  // ── CHECKLIST ITEMS ────────────────────────────────────────────────────────
  await Promise.all([
    // Acme Corp checklist
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Tools',     item: 'Fluke DTX-1800 cable tester',         checked: true,  assigneeName: 'Alex Rivera', notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Tools',     item: 'Laptop with Cisco IOS image loaded',   checked: true,  assigneeName: 'Jordan Kim',  notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Tools',     item: 'Console cable + USB-C adapter',        checked: false, assigneeName: 'Alex Rivera', notes: 'Need to source from tool crib before site visit' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Tools',     item: 'Label maker + extra tape cartridge',   checked: true,  assigneeName: 'Alex Rivera', notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Materials', item: 'Cat6A patch cables 1ft x50',           checked: true,  assigneeName: 'Morgan Lee',  notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Materials', item: 'Rack mounting screws and cage nuts',   checked: false, assigneeName: 'Alex Rivera', notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Materials', item: 'Velcro cable ties x100',               checked: true,  assigneeName: 'Alex Rivera', notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Docs',      item: 'Network diagram — as-built version',   checked: false, assigneeName: 'Jordan Kim',  notes: 'In progress — 80% complete' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Docs',      item: 'Change management form signed',        checked: true,  assigneeName: 'Morgan Lee',  notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Docs',      item: 'Rollback plan documented',             checked: true,  assigneeName: 'Jordan Kim',  notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Access',    item: 'Data centre keycard request submitted',checked: true,  assigneeName: 'Morgan Lee',  notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: acme.id, category: 'Access',    item: 'Client on-site escort arranged',       checked: false, assigneeName: 'Jordan Kim',  notes: 'Confirm with facilities 48h before visit' }}),
    // GlobalTech checklist
    prisma.checklistItem.create({ data: { projectId: globaltech.id, category: 'Access',    item: 'Global Admin credentials secured in vault', checked: true,  assigneeName: 'Taylor Chen', notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: globaltech.id, category: 'Access',    item: 'MFA bypass code obtained for migration',    checked: true,  assigneeName: 'Taylor Chen', notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: globaltech.id, category: 'Docs',      item: 'Migration runbook approved by client',      checked: false, assigneeName: 'Taylor Chen', notes: 'Pending sign-off from IT Manager' }}),
    prisma.checklistItem.create({ data: { projectId: globaltech.id, category: 'Docs',      item: 'User communication email drafted',           checked: true,  assigneeName: 'Morgan Lee',  notes: '' }}),
    prisma.checklistItem.create({ data: { projectId: globaltech.id, category: 'Materials', item: 'Outlook profile migration tool tested',      checked: true,  assigneeName: 'Taylor Chen', notes: '' }}),
  ]);
  console.log('✓ Created checklist items');

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n✅ Demo seed complete!');
  console.log('─────────────────────────────────');
  console.log(`  Engineers:       ${engineers.length}`);
  console.log(`  Projects:        ${projects.length}`);
  console.log(`  Risks:           7`);
  console.log(`  Lessons:         6`);
  console.log(`  Schedule phases: 9`);
  console.log(`  Procurement:     8 items`);
  console.log(`  Checklist:       17 items`);
  console.log('─────────────────────────────────');
  console.log('\n  Open Prisma Studio to browse:');
  console.log('  npx prisma studio\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
