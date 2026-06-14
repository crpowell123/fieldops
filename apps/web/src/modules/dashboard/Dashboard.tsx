import { useState, useMemo } from 'react';
import { UserButton, useOrganization } from '@clerk/clerk-react';
import { C, Chip, Avatar, Spinner } from '../../components/ui';
import {
  useProjects, useRisks, useProcurement, useSchedule,
  useEngineers, useResourceSpans, useCWStatus, useCWSync,
} from '../../hooks/useData';

// Module imports
import { RMSModule }         from '../rms/RMSModule';
import { RiskModule }        from '../risk/RiskModule';
import { LessonsModule }     from '../lessons/LessonsModule';
import { ScheduleModule }    from '../schedule/ScheduleModule';
import { ProcurementModule } from '../procurement/ProcurementModule';
import { ChecklistModule }   from '../checklist/ChecklistModule';
import { DocsModule }        from '../docs/DocsModule';
import { SettingsPage }      from '../settings/SettingsPage';

// ── NAV ───────────────────────────────────────────────────────────────────────

const NAV = [
  { id:'home',         label:'Overview',                icon:'⊞'  },
  { id:'rms',          label:'Resource Management',     icon:'👥' },
  { id:'risk',         label:'Risk Register',           icon:'⚠️'  },
  { id:'schedule',     label:'Schedule & Dependencies', icon:'📅' },
  { id:'procurement',  label:'Procurement',             icon:'📦' },
  { id:'checklist',    label:'Material Checklist',      icon:'✅' },
  { id:'docs',         label:'Project Documents',       icon:'📄' },
  { id:'lessons',      label:'Lessons Learned',         icon:'💡' },
  { id:'settings',     label:'Settings',                icon:'⚙️'  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function addDays(ds: string, n: number): string {
  const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDate(ds: string): string {
  return new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' });
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}
const PC = ['#3b82f6','#f59e0b','#10b981','#ef4444','#a78bfa','#14b8a6'];

// ── PROJECT PROGRESS CARDS ────────────────────────────────────────────────────

function ProjectProgressSection() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: risks = [] }               = useRisks();
  const { data: proc = [] }                = useProcurement();
  const { data: engineers = [] }           = useEngineers();
  const { data: spans = [] }               = useResourceSpans();

  const today = new Date().toISOString().slice(0, 10);

  const projectStats = useMemo(() => projects.map((p: any, i: number) => {
    const projRisks   = risks.filter((r: any) => r.projectId === p.id && r.status !== 'Closed');
    const critRisks   = projRisks.filter((r: any) => r.probability * r.impact >= 12);
    const projProc    = proc.filter((x: any) => x.projectId === p.id);
    const delivered   = projProc.filter((x: any) => x.status === 'Delivered' || x.status === 'Provisioned').length;
    const procPct     = projProc.length ? Math.round((delivered / projProc.length) * 100) : 0;
    const activeEng   = spans.filter((s: any) => s.projectId === p.id && s.startDate <= today && s.endDate >= today);
    const engNames    = [...new Set(activeEng.map((s: any) => s.engineerId))]
      .map(id => engineers.find((e: any) => e.id === id))
      .filter(Boolean);

    const budget    = p.budget || 0;
    const spent     = p.spent  || 0;
    const budgetPct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;

    const daysTotal = p.startDate && p.endDate ? daysBetween(p.startDate, p.endDate) : 0;
    const daysGone  = p.startDate ? Math.max(0, daysBetween(p.startDate, today)) : 0;
    const timePct   = daysTotal > 0 ? Math.min(Math.round((daysGone / daysTotal) * 100), 100) : 0;

    const statusColor = p.status === 'In Progress' ? C.blue
      : p.status === 'Completed' ? C.green
      : p.status === 'On Hold'   ? C.amber
      : p.status === 'Cancelled' ? C.red : C.t2;

    return { p, projRisks, critRisks, procPct, budgetPct, timePct, engNames, color: PC[i % PC.length], statusColor };
  }), [projects, risks, proc, spans, engineers, today]);

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>;
  if (!projects.length) return (
    <div style={{ background:C.bg2, borderRadius:12, padding:'32px 24px', textAlign:'center', color:C.t2, fontSize:13 }}>
      No projects yet. Connect ConnectWise or add projects in Settings.
    </div>
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
      {projectStats.map(({ p, projRisks, critRisks, procPct, budgetPct, timePct, engNames, color, statusColor }) => (
        <div key={p.id} style={{ background:C.bg1, border:`1px solid ${C.bd}`, borderRadius:12, overflow:'hidden' }}>
          {/* Color accent top bar */}
          <div style={{ height:3, background:color }} />
          <div style={{ padding:'16px 18px' }}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.t0, lineHeight:1.3, marginBottom:4 }}>{p.name}</div>
                <div style={{ fontSize:11, color:C.t2 }}>{p.company}</div>
              </div>
              <span style={{ background:statusColor+'22', color:statusColor, fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:99, border:`1px solid ${statusColor}44`, flexShrink:0, marginLeft:10 }}>
                {p.status}
              </span>
            </div>

            {/* Phase badge */}
            {p.phase && (
              <div style={{ fontSize:11, color:C.blue, background:C.blueBg, border:`1px solid ${C.blue}33`, borderRadius:6, padding:'3px 10px', display:'inline-block', marginBottom:12 }}>
                {p.phase}
              </div>
            )}

            {/* Progress bars */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
              <ProgressRow label="Timeline" pct={timePct} color={timePct > budgetPct + 15 ? C.red : C.blue}
                right={p.endDate ? `Due ${fmtDate(p.endDate)}` : '—'} />
              <ProgressRow label="Budget"   pct={budgetPct} color={budgetPct > 90 ? C.red : budgetPct > 75 ? C.amber : C.green}
                right={p.budget ? `$${(p.spent/1000).toFixed(0)}k / $${(p.budget/1000).toFixed(0)}k` : '—'} />
              <ProgressRow label="Procurement" pct={procPct} color={C.teal}
                right={`${procPct}% delivered`} />
            </div>

            {/* Indicators row */}
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              {critRisks.length > 0 && (
                <span style={{ background:C.redBg, color:C.red, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, border:`1px solid ${C.red}44` }}>
                  ⚠ {critRisks.length} critical risk{critRisks.length > 1 ? 's' : ''}
                </span>
              )}
              {projRisks.length > 0 && critRisks.length === 0 && (
                <span style={{ background:C.amberBg, color:C.amber, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, border:`1px solid ${C.amber}44` }}>
                  {projRisks.length} open risk{projRisks.length > 1 ? 's' : ''}
                </span>
              )}
              {/* Active engineers */}
              <div style={{ display:'flex', marginLeft:'auto' }}>
                {engNames.slice(0, 4).map((eng: any, i: number) => (
                  <div key={eng.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 4-i }}>
                    <Avatar name={eng.name} color={eng.color} size={22} />
                  </div>
                ))}
                {engNames.length > 4 && (
                  <div style={{ width:22, height:22, borderRadius:'50%', background:C.bg3, border:`1.5px solid ${C.bd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:C.t2, marginLeft:-8 }}>
                    +{engNames.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressRow({ label, pct, color, right }: { label: string; pct: number; color: string; right: string }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, color:C.t2 }}>{label}</span>
        <span style={{ fontSize:11, color:C.t1 }}>{right}</span>
      </div>
      <div style={{ height:5, background:C.bg3, borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.3s' }} />
      </div>
    </div>
  );
}

// ── 3-WEEK LOOKAHEAD ──────────────────────────────────────────────────────────

function ThreeWeekLookahead() {
  const { data: projects = [] }  = useProjects();
  const { data: phases = [] }    = useSchedule();
  const { data: risks = [] }     = useRisks();
  const { data: proc = [] }      = useProcurement();

  const today   = new Date().toISOString().slice(0, 10);
  const horizon = addDays(today, 21);

  // Build 3 weeks
  const weeks = [0, 1, 2].map(w => {
    const wStart = addDays(today, w * 7);
    const wEnd   = addDays(today, w * 7 + 6);
    return { label: w === 0 ? 'This week' : w === 1 ? 'Next week' : 'Week 3', wStart, wEnd };
  });

  // Phases ending or active in the next 21 days
  const upcomingPhases = phases.filter((ph: any) =>
    ph.endDate >= today && ph.startDate <= horizon && ph.status !== 'Done'
  );

  // Risks with status Open or Watching in critical/high
  const hotRisks = risks.filter((r: any) =>
    r.probability * r.impact >= 12 && r.status !== 'Closed' && r.status !== 'Accepted'
  ).slice(0, 4);

  // Procurement arriving in window
  const arrivingPO = proc.filter((x: any) =>
    x.eta && x.eta >= today && x.eta <= horizon && x.status !== 'Delivered' && x.status !== 'Provisioned'
  ).slice(0, 5);

  const projName = (id: string) => projects.find((p: any) => p.id === id)?.name ?? id;
  const projColor = (id: string) => PC[projects.findIndex((p: any) => p.id === id) % PC.length] ?? C.t2;

  return (
    <div>
      {/* Week columns */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {weeks.map(({ label, wStart, wEnd }) => {
          const weekPhases = upcomingPhases.filter((ph: any) =>
            ph.startDate <= wEnd && ph.endDate >= wStart
          );
          return (
            <div key={label} style={{ background:C.bg1, border:`1px solid ${C.bd}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.bd}`, background:C.bg2 }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.t0 }}>{label}</div>
                <div style={{ fontSize:10, color:C.t2 }}>{fmtDate(wStart)} – {fmtDate(wEnd)}</div>
              </div>
              <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:6, minHeight:80 }}>
                {!weekPhases.length && (
                  <div style={{ fontSize:11, color:C.t3, fontStyle:'italic', padding:'8px 0' }}>No active phases</div>
                )}
                {weekPhases.map((ph: any) => {
                  const col = projColor(ph.projectId);
                  const isEnding = ph.endDate >= wStart && ph.endDate <= wEnd;
                  return (
                    <div key={ph.id} style={{ background:C.bg3, borderRadius:7, padding:'8px 10px', borderLeft:`3px solid ${col}` }}>
                      <div style={{ fontSize:11, fontWeight:600, color:C.t0, marginBottom:2 }}>{ph.phase}</div>
                      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, color:C.t2 }}>{projName(ph.projectId)}</span>
                        <Chip label={ph.status} size={9} />
                        {isEnding && (
                          <span style={{ fontSize:9, fontWeight:700, color:C.amber, background:C.amberBg, padding:'1px 6px', borderRadius:99 }}>
                            ends {fmtDate(ph.endDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hot risks + arriving POs side by side */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {/* Hot risks */}
        <div style={{ background:C.bg1, border:`1px solid ${C.bd}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.bd}`, background:C.bg2, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, fontWeight:600, color:C.t0 }}>Risks needing attention</span>
            {hotRisks.length > 0 && (
              <span style={{ background:C.redBg, color:C.red, fontSize:10, fontWeight:600, padding:'1px 8px', borderRadius:99 }}>
                {hotRisks.length}
              </span>
            )}
          </div>
          <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
            {!hotRisks.length && (
              <div style={{ fontSize:11, color:C.t3, fontStyle:'italic', padding:'8px 0' }}>No critical or high risks open</div>
            )}
            {hotRisks.map((r: any) => {
              const sc = r.probability * r.impact;
              const col = sc >= 20 ? C.red : C.amber;
              return (
                <div key={r.id} style={{ display:'flex', gap:8, alignItems:'flex-start', background:C.bg3, borderRadius:7, padding:'8px 10px' }}>
                  <div style={{ width:26, height:26, borderRadius:6, background:`${col}22`, border:`1.5px solid ${col}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:col, flexShrink:0 }}>
                    {sc}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:500, color:C.t0, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
                    <div style={{ fontSize:10, color:C.t2 }}>{projName(r.projectId)} · {r.owner || '—'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arriving POs */}
        <div style={{ background:C.bg1, border:`1px solid ${C.bd}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.bd}`, background:C.bg2, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, fontWeight:600, color:C.t0 }}>Procurement arriving (21 days)</span>
            {arrivingPO.length > 0 && (
              <span style={{ background:C.purpleBg, color:C.purple, fontSize:10, fontWeight:600, padding:'1px 8px', borderRadius:99 }}>
                {arrivingPO.length}
              </span>
            )}
          </div>
          <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
            {!arrivingPO.length && (
              <div style={{ fontSize:11, color:C.t3, fontStyle:'italic', padding:'8px 0' }}>No ETAs in the next 3 weeks</div>
            )}
            {arrivingPO.map((x: any) => (
              <div key={x.id} style={{ display:'flex', gap:8, alignItems:'center', background:C.bg3, borderRadius:7, padding:'8px 10px' }}>
                <span style={{ fontSize:16, flexShrink:0 }}>📦</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:500, color:C.t0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{x.item}</div>
                  <div style={{ fontSize:10, color:C.t2 }}>{x.vendor} · {projName(x.projectId)}</div>
                </div>
                <div style={{ fontSize:10, color:C.purple, fontWeight:600, flexShrink:0 }}>ETA {fmtDate(x.eta)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RMS SNAPSHOT ──────────────────────────────────────────────────────────────

function RMSSnapshot({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { data: engineers = [], isLoading } = useEngineers();
  const { data: spans = [] }                = useResourceSpans();
  const { data: projects = [] }             = useProjects();

  const today  = new Date().toISOString().slice(0, 10);
  const CAP    = 40;

  // Hours in the current week per engineer
  const weekHours = (engId: string) => {
    const weekStart = today;
    const weekEnd   = addDays(today, 6);
    return spans.filter((s: any) => s.engineerId === engId && s.startDate <= weekEnd && s.endDate >= weekStart)
      .reduce((sum: number, s: any) => {
        const os = s.startDate > weekStart ? s.startDate : weekStart;
        const oe = s.endDate < weekEnd ? s.endDate : weekEnd;
        return sum + Math.max(0, daysBetween(os, oe) + 1) * s.hoursPerDay;
      }, 0);
  };

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:16 }}><Spinner /></div>;
  if (!engineers.length) return (
    <div style={{ fontSize:12, color:C.t2, padding:'16px 0', textAlign:'center' }}>No engineers configured</div>
  );

  return (
    <div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {engineers.map((eng: any) => {
          const hrs   = weekHours(eng.id);
          const pct   = Math.min((hrs / CAP) * 100, 100);
          const col   = hrs > CAP ? C.red : hrs > 30 ? C.amber : hrs > 0 ? C.blue : C.t3;
          const active = spans.filter((s: any) =>
            s.engineerId === eng.id && s.startDate <= today && s.endDate >= today
          );
          const projNames = [...new Set(active.map((s: any) => s.projectId))]
            .map(id => projects.find((p: any) => p.id === id)?.name ?? id);
          return (
            <div key={eng.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Avatar name={eng.name} color={eng.color} size={26} />
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:12, color:C.t0, fontWeight:500 }}>{eng.name}</span>
                  <span style={{ fontSize:11, color:col, fontWeight:600 }}>{hrs}h this wk</span>
                </div>
                <div style={{ height:5, background:C.bg3, borderRadius:3, overflow:'hidden', marginBottom:3 }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:3 }} />
                </div>
                {projNames.length > 0 && (
                  <div style={{ fontSize:10, color:C.t2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {projNames.join(', ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => onNavigate('rms')}
        style={{ marginTop:14, width:'100%', background:'none', border:`1px solid ${C.bd}`, borderRadius:8, padding:'8px', color:C.t1, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}
      >
        Open full resource calendar →
      </button>
    </div>
  );
}

// ── OVERVIEW HOME ──────────────────────────────────────────────────────────────

function OverviewHome({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { data: projects = [] }  = useProjects();
  const { data: risks = [] }     = useRisks();
  const { data: proc = [] }      = useProcurement();
  const { data: engineers = [] } = useEngineers();

  const openRisks    = risks.filter((r: any) => r.status === 'Open' || r.status === 'Watching').length;
  const criticalRisks = risks.filter((r: any) => r.probability * r.impact >= 12 && r.status !== 'Closed').length;
  const pendingPOs   = proc.filter((p: any) => p.status === 'Pending PO').length;
  const activeProj   = projects.filter((p: any) => p.status === 'In Progress').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Top KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Active projects',  value:activeProj,     color:C.blue,   sub:`${projects.length} total`             },
          { label:'Engineers',        value:engineers.length, color:C.teal,  sub:'in team'                              },
          { label:'Open risks',       value:openRisks,      color: criticalRisks > 0 ? C.red : C.amber, sub: criticalRisks > 0 ? `${criticalRisks} critical` : 'none critical' },
          { label:'Pending POs',      value:pendingPOs,     color:C.purple, sub:'awaiting order'                       },
        ].map(m => (
          <div key={m.label} style={{ background:C.bg1, border:`1px solid ${C.bd}`, borderRadius:12, padding:'16px 18px', cursor:'default' }}>
            <div style={{ fontSize:11, color:C.t2, marginBottom:8 }}>{m.label}</div>
            <div style={{ fontSize:28, fontWeight:600, color:m.color, lineHeight:1, marginBottom:4 }}>{m.value}</div>
            <div style={{ fontSize:11, color:C.t3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Project progress */}
      <Section title="Project progress" action={<NavLink onClick={() => onNavigate('schedule')}>View schedule →</NavLink>}>
        <ProjectProgressSection />
      </Section>

      {/* 3-week lookahead */}
      <Section title="3-week lookahead" action={<NavLink onClick={() => onNavigate('procurement')}>View procurement →</NavLink>}>
        <ThreeWeekLookahead />
      </Section>

      {/* RMS snapshot */}
      <Section title="Resource snapshot — this week" action={<NavLink onClick={() => onNavigate('rms')}>Full calendar →</NavLink>}>
        <RMSSnapshot onNavigate={onNavigate} />
      </Section>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.t0 }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function NavLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background:'none', border:'none', color:C.blue, fontSize:12, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
      {children}
    </button>
  );
}

// ── DASHBOARD SHELL ───────────────────────────────────────────────────────────

export function Dashboard() {
  const [activeModule, setActiveModule] = useState('home');
  const { organization } = useOrganization();
  const { data: risks = [] }  = useRisks();
  const { data: proc = [] }   = useProcurement();
  const { data: cwStatus }    = useCWStatus();
  const syncMutation          = useCWSync();

  const openRisks  = risks.filter((r: any) => r.status === 'Open').length;
  const pendingPOs = proc.filter((p: any) => p.status === 'Pending PO').length;

  const alertMap: Record<string, boolean> = {
    risk:        openRisks > 0,
    procurement: pendingPOs > 0,
  };

  const cwConnected = !!cwStatus;
  const cwSyncing   = cwStatus?.syncStatus === 'syncing';
  const cwError     = cwStatus?.syncStatus === 'error';

  return (
    <div style={{ fontFamily:'DM Sans,Segoe UI,sans-serif', background:C.bg0, color:C.t0, minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* ── TOP BAR ── */}
      <div style={{ background:C.bg1, borderBottom:`1px solid ${C.bd}`, padding:'0 24px', display:'flex', alignItems:'center', height:52, flexShrink:0, gap:10 }}>
        <div style={{ width:30, height:30, background:'linear-gradient(135deg,#3b82f6,#6366f1)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#fff', fontWeight:700, flexShrink:0 }}>F</div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.t0, letterSpacing:'-0.03em', lineHeight:1 }}>FieldOps</div>
          <div style={{ fontSize:9, color:C.t2, letterSpacing:'0.1em' }}>{organization?.name?.toUpperCase()}</div>
        </div>
        <div style={{ height:24, width:1, background:C.bd, margin:'0 4px' }} />

        {openRisks > 0 && (
          <button onClick={() => setActiveModule('risk')} style={{ background:C.amberBg, border:`1px solid ${C.amber}40`, borderRadius:99, padding:'3px 10px', fontSize:10, fontWeight:700, color:C.amber, cursor:'pointer', fontFamily:'inherit' }}>
            ⚠ {openRisks} open risk{openRisks > 1 ? 's' : ''}
          </button>
        )}
        {pendingPOs > 0 && (
          <button onClick={() => setActiveModule('procurement')} style={{ background:C.purpleBg, border:`1px solid ${C.purple}40`, borderRadius:99, padding:'3px 10px', fontSize:10, fontWeight:700, color:C.purple, cursor:'pointer', fontFamily:'inherit' }}>
            {pendingPOs} pending PO{pendingPOs > 1 ? 's' : ''}
          </button>
        )}

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.t2 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background: cwError ? C.red : cwConnected ? C.green : C.t3 }} />
            {cwError ? 'CW Error' : cwSyncing ? 'Syncing…' : cwConnected
              ? `Synced ${cwStatus?.lastSyncedAt ? new Date(cwStatus.lastSyncedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : ''}`
              : 'Not connected'}
          </div>
          {cwConnected && !cwSyncing && (
            <button onClick={() => syncMutation.mutate()} style={{ background:C.bg3, border:`1px solid ${C.bd}`, borderRadius:6, padding:'4px 10px', color:C.t1, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
              ↻ Sync
            </button>
          )}
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* ── SIDEBAR ── */}
        <div style={{ width:216, background:C.bg1, borderRight:`1px solid ${C.bd}`, flexShrink:0, padding:'16px 10px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
          <div style={{ fontSize:9, fontWeight:700, color:C.t3, letterSpacing:'0.12em', marginBottom:6, paddingLeft:10 }}>FIELDOPS</div>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActiveModule(n.id)} style={{
              background: activeModule === n.id ? C.blueBg : 'transparent',
              border: `1px solid ${activeModule === n.id ? C.blue+'55' : 'transparent'}`,
              borderRadius:8, padding:'8px 12px',
              color: activeModule === n.id ? C.blue : C.t1,
              fontSize:12, fontWeight: activeModule === n.id ? 600 : 400,
              cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:9,
              fontFamily:'inherit', width:'100%', transition:'all 0.1s',
            }}>
              <span style={{ fontSize:13 }}>{n.icon}</span>
              <span style={{ flex:1, lineHeight:1.3 }}>{n.label}</span>
              {alertMap[n.id] && <span style={{ width:6, height:6, borderRadius:'50%', background:C.red, flexShrink:0 }} />}
            </button>
          ))}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
          {activeModule === 'home'        && <OverviewHome onNavigate={setActiveModule} />}
          {activeModule === 'rms'         && <RMSModule />}
          {activeModule === 'risk'        && <RiskModule />}
          {activeModule === 'lessons'     && <LessonsModule />}
          {activeModule === 'schedule'    && <ScheduleModule />}
          {activeModule === 'procurement' && <ProcurementModule />}
          {activeModule === 'checklist'   && <ChecklistModule />}
          {activeModule === 'docs'        && <DocsModule />}
          {activeModule === 'settings'    && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}
