import { useState, useMemo } from 'react';
import {
  C, SectionHdr, TabBar, Card, Btn, Modal, Field,
  Inp, Sel, Textarea, Chip, Spinner, Empty,
} from '../../components/ui';
import {
  useRisks, useProjects, useCreateRisk,
  useUpdateRisk, useDeleteRisk, useAnalyzeRegulations,
} from '../../hooks/useData';
import type { Risk, RiskStatus, RiskCategory, WorkTypeId } from '../../lib/types';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const CATEGORIES: RiskCategory[] = [
  'Scope','Resource','Technical','Commercial','Security','Supply Chain','Vendor','Regulatory',
];
const STATUS_ORDER: RiskStatus[] = ['Open','Watching','Accepted','Closed'];

const WORK_TYPES = [
  { id:'network_cabling' as WorkTypeId, label:'Network Cabling',  desc:'Cat5e/6/6A, IDF/MDF, plenum' },
  { id:'trenching'       as WorkTypeId, label:'Trenching',         desc:'Underground conduit, boring'  },
  { id:'aerial_cable'    as WorkTypeId, label:'Aerial Cable',      desc:'Pole attachment, NESC'        },
  { id:'fiber'           as WorkTypeId, label:'Fiber Optic',       desc:'OSP/ISP, splicing, OTDR'      },
  { id:'access_control'  as WorkTypeId, label:'Access Control',    desc:'Controllers, card readers'    },
  { id:'surveillance'    as WorkTypeId, label:'Surveillance/CCTV', desc:'IP cameras, NVR, audio'       },
];

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming','Washington D.C.',
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function score(r: Risk) { return r.probability * r.impact; }

function severity(r: Risk): 'Critical' | 'High' | 'Medium' | 'Low' {
  const s = score(r);
  return s >= 20 ? 'Critical' : s >= 12 ? 'High' : s >= 6 ? 'Medium' : 'Low';
}

function sevColor(sev: string) {
  return sev === 'Critical' ? C.red : sev === 'High' ? C.amber : sev === 'Medium' ? C.blue : C.green;
}
function sevBg(sev: string) {
  return sev === 'Critical' ? C.redBg : sev === 'High' ? C.amberBg : sev === 'Medium' ? C.blueBg : C.tealBg;
}

const BLANK_FORM = {
  projectId: '', title: '', category: 'Technical' as RiskCategory,
  probability: 3, impact: 3, status: 'Open' as RiskStatus,
  mitigation: '', linkedProposal: '', owner: '',
};

// ── RISK REGISTER TAB ─────────────────────────────────────────────────────────

function RiskRegisterTab() {
  const { data: risks = [], isLoading } = useRisks();
  const { data: projects = [] } = useProjects();
  const createRisk  = useCreateRisk();
  const updateRisk  = useUpdateRisk();
  const deleteRisk  = useDeleteRisk();

  // UI state
  const [showAdd, setShowAdd]       = useState(false);
  const [detail, setDetail]         = useState<Risk | null>(null);
  const [form, setForm]             = useState(BLANK_FORM);
  const [filterProj, setFilterProj] = useState('');
  const [filterSev,  setFilterSev]  = useState('');
  const [filterSt,   setFilterSt]   = useState('');
  const [filterOwn,  setFilterOwn]  = useState('');
  const [tab, setTab]               = useState<'list'|'matrix'>('list');

  // Derived data
  const owners = useMemo(() => [...new Set(risks.map((r: Risk) => r.owner).filter(Boolean))], [risks]);

  const filtered = useMemo(() => risks.filter((r: Risk) => {
    if (filterProj && r.projectId !== filterProj) return false;
    if (filterSev  && severity(r) !== filterSev)  return false;
    if (filterSt   && r.status !== filterSt)       return false;
    if (filterOwn  && r.owner !== filterOwn)        return false;
    return true;
  }), [risks, filterProj, filterSev, filterSt, filterOwn]);

  // Metrics
  const criticalCount = risks.filter((r: Risk) => score(r) >= 12).length;
  const avgScore = risks.length
    ? (risks.reduce((a: number, r: Risk) => a + score(r), 0) / risks.length).toFixed(1)
    : '—';
  const closedCount = risks.filter((r: Risk) => r.status === 'Closed').length;

  // Heatmap
  const matrix = useMemo(() =>
    Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => {
        const p = 5 - i, im = j + 1;
        return {
          p, im,
          rs: risks.filter((r: Risk) => r.probability === p && r.impact === im && r.status !== 'Closed'),
        };
      })
    ), [risks]);

  // Actions
  const openAdd = () => { setForm(BLANK_FORM); setShowAdd(true); };

  const submitAdd = async () => {
    if (!form.title.trim() || !form.projectId) return;
    await createRisk.mutateAsync(form as any);
    setShowAdd(false);
  };

  const advanceStatus = async (r: Risk) => {
    const idx = STATUS_ORDER.indexOf(r.status);
    const next = STATUS_ORDER[idx < STATUS_ORDER.length - 1 ? idx + 1 : 0];
    await updateRisk.mutateAsync({ id: r.id, status: next });
    // refresh detail view
    setDetail(d => d?.id === r.id ? { ...d, status: next } : d);
  };

  const cloneRisk = async (r: Risk) => {
    await createRisk.mutateAsync({
      projectId: r.projectId, title: `Copy of ${r.title}`,
      category: r.category, probability: r.probability, impact: r.impact,
      status: 'Open', mitigation: r.mitigation, owner: r.owner,
    } as any);
    setDetail(null);
  };

  const doDelete = async (r: Risk) => {
    await deleteRisk.mutateAsync(r.id);
    setDetail(null);
  };

  if (isLoading) {
    return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>;
  }

  return (
    <div>
      {/* ── Add modal ── */}
      {showAdd && (
        <Modal title="Add risk" onClose={() => setShowAdd(false)}>
          <Field label="Project">
            <Sel value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Select project…</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Sel>
          </Field>
          <Field label="Risk title">
            <Inp value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Describe the risk briefly" />
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Category">
              <Sel value={form.category} onChange={e => setForm({ ...form, category: e.target.value as RiskCategory })}>
                {CATEGORIES.map(x => <option key={x}>{x}</option>)}
              </Sel>
            </Field>
            <Field label="Owner">
              <Inp value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="Assignee name" />
            </Field>
            <Field label={`Probability ${form.probability}/5`}>
              <input type="range" min={1} max={5} value={form.probability}
                onChange={e => setForm({ ...form, probability: Number(e.target.value) })}
                style={{ width:'100%', accentColor: C.blue }} />
            </Field>
            <Field label={`Impact ${form.impact}/5`}>
              <input type="range" min={1} max={5} value={form.impact}
                onChange={e => setForm({ ...form, impact: Number(e.target.value) })}
                style={{ width:'100%', accentColor: C.red }} />
            </Field>
          </div>
          <Field label="Mitigation plan">
            <Textarea value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })}
              placeholder="Steps being taken or planned…" />
          </Field>
          <Field label="Linked proposal (optional)">
            <Inp value={form.linkedProposal} onChange={e => setForm({ ...form, linkedProposal: e.target.value })}
              placeholder="Proposal name or reference" />
          </Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" loading={createRisk.isPending} onClick={submitAdd}>Save risk</Btn>
          </div>
        </Modal>
      )}

      {/* ── Detail modal ── */}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            {[
              ['Project', projects.find((p: any) => p.id === detail.projectId)?.name ?? detail.projectId],
              ['Category', detail.category],
              ['Severity', severity(detail)],
              ['Score (P×I)', `${detail.probability} × ${detail.impact} = ${score(detail)}`],
              ['Status', detail.status],
              ['Owner', detail.owner || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: C.bg2, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:10, color:C.t2, fontWeight:600, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k}</div>
                <div style={{ fontSize:13, color:C.t0, fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>
          {detail.mitigation && (
            <div style={{ background:C.bg3, borderRadius:8, padding:'10px 14px', marginBottom:14 }}>
              <div style={{ fontSize:10, color:C.t2, fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Mitigation plan</div>
              <div style={{ fontSize:13, color:C.t1, lineHeight:1.6 }}>{detail.mitigation}</div>
            </div>
          )}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', borderTop:`1px solid ${C.bd}`, paddingTop:14 }}>
            <Btn onClick={() => advanceStatus(detail)} loading={updateRisk.isPending}>
              {detail.status === 'Closed' ? '↺ Reopen' : '→ Advance status'}
            </Btn>
            <Btn onClick={() => cloneRisk(detail)} loading={createRisk.isPending}>Clone</Btn>
            <Btn onClick={() => doDelete(detail)} loading={deleteRisk.isPending}
              style={{ color:C.red, borderColor:`${C.red}55` }}>Delete</Btn>
          </div>
        </Modal>
      )}

      {/* ── Metrics ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total risks',       value: risks.length,    color: C.t0  },
          { label:'Critical / high',   value: criticalCount,   color: C.red },
          { label:'Avg risk score',    value: avgScore,        color: C.amber },
          { label:'Closed this cycle', value: closedCount,     color: C.green },
        ].map(m => (
          <div key={m.label} style={{ background:C.bg2, borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:C.t2, marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:500, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Sub-tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:`1px solid ${C.bd}` }}>
        {(['list','matrix'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize:13, padding:'8px 16px', border:'none', background:'none', cursor:'pointer',
            color: tab === t ? C.t0 : C.t2,
            fontWeight: tab === t ? 500 : 400,
            borderBottom: tab === t ? `2px solid ${C.t0}` : '2px solid transparent',
            marginBottom:-1,
          }}>
            {t === 'list' ? 'Risk list' : 'Heatmap'}
          </button>
        ))}
      </div>

      {/* ── List view ── */}
      {tab === 'list' && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <Sel value={filterProj} onChange={e => setFilterProj(e.target.value)} style={{ fontSize:12 }}>
                <option value="">All projects</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Sel>
              <Sel value={filterSev} onChange={e => setFilterSev(e.target.value)} style={{ fontSize:12 }}>
                <option value="">All severities</option>
                {['Critical','High','Medium','Low'].map(s => <option key={s}>{s}</option>)}
              </Sel>
              <Sel value={filterSt} onChange={e => setFilterSt(e.target.value)} style={{ fontSize:12 }}>
                <option value="">All statuses</option>
                {STATUS_ORDER.map(s => <option key={s}>{s}</option>)}
              </Sel>
              <Sel value={filterOwn} onChange={e => setFilterOwn(e.target.value)} style={{ fontSize:12 }}>
                <option value="">All owners</option>
                {owners.map(o => <option key={o}>{o}</option>)}
              </Sel>
            </div>
            <Btn variant="primary" onClick={openAdd}>+ Add risk</Btn>
          </div>

          {!filtered.length
            ? <Empty icon="✅" message="No risks match your filters" sub="Try clearing a filter or add a new risk" />
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[...filtered].sort((a: Risk, b: Risk) => score(b) - score(a)).map((r: Risk) => {
                  const sc  = score(r);
                  const sev = severity(r);
                  const col = sevColor(sev);
                  const bg  = sevBg(sev);
                  const proj = projects.find((p: any) => p.id === r.projectId);
                  const pct  = Math.round((sc / 25) * 100);
                  return (
                    <div key={r.id} onClick={() => setDetail(r)} style={{ cursor:'pointer' }}>
                    <Card style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            {/* Score badge */}
                            <div style={{ width:32, height:32, borderRadius:8, background:`${col}22`, border:`1.5px solid ${col}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:col, flexShrink:0 }}>
                              {sc}
                            </div>
                            <span style={{ fontSize:13, fontWeight:500, color:C.t0 }}>{r.title}</span>
                            <span style={{ background:bg, color:col, fontSize:10, fontWeight:600, padding:'1px 8px', borderRadius:99, flexShrink:0 }}>
                              {sev}
                            </span>
                          </div>
                          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                            {/* Score bar */}
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ width:56, height:5, borderRadius:3, background:C.bd, overflow:'hidden' }}>
                                <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:3 }} />
                              </div>
                            </div>
                            <span style={{ fontSize:11, color:C.t2 }}>{r.category}</span>
                            <span style={{ fontSize:11, color:C.t2 }}>·</span>
                            <span style={{ fontSize:11, color:C.t2 }}>{proj?.name ?? r.projectId}</span>
                            <span style={{ fontSize:11, color:C.t2 }}>·</span>
                            <span style={{ fontSize:11, color:C.t2 }}>{r.owner || '—'}</span>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                          <Chip label={r.status} size={10} />
                          <button
                            onClick={async e => { e.stopPropagation(); await doDelete(r); }}
                            style={{ background:'none', border:'none', color:C.t3, cursor:'pointer', fontSize:18, lineHeight:1, padding:'0 4px' }}
                            title="Delete risk"
                          >×</button>
                        </div>
                      </div>
                      {r.mitigation && (
                        <div style={{ marginTop:8, background:C.bg3, borderRadius:6, padding:'7px 12px', fontSize:11, color:C.t1 }}>
                          <span style={{ color:C.t2, fontWeight:600 }}>Mitigation: </span>{r.mitigation}
                        </div>
                      )}
                    </Card>
                    </div>
                  );
                })}
              </div>
            )
          }
        </>
      )}

      {/* ── Heatmap view ── */}
      {tab === 'matrix' && (
        <Card style={{ padding:20 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.t2, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:16 }}>
            Probability × impact matrix (open risks)
          </div>
          <div style={{ display:'flex', gap:2 }}>
            {/* Y labels */}
            <div style={{ display:'flex', flexDirection:'column', gap:2, marginRight:8, marginBottom:28 }}>
              {[5,4,3,2,1].map(p => (
                <div key={p} style={{ height:52, display:'flex', alignItems:'center', justifyContent:'flex-end', fontSize:10, color:C.t2, fontWeight:600, width:16 }}>
                  {p}
                </div>
              ))}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'grid', gridTemplateRows:'repeat(5,52px)', gridTemplateColumns:'repeat(5,1fr)', gap:3 }}>
                {matrix.flat().map(({ p, im, rs }) => {
                  const sc = p * im;
                  const cellBg = sc >= 20 ? '#fff0f0' : sc >= 12 ? '#fffbf0' : sc >= 6 ? '#f0f4ff' : '#f0fff4';
                  const cellBd = sc >= 20 ? `${C.red}44` : sc >= 12 ? `${C.amber}44` : sc >= 6 ? `${C.blue}44` : `${C.green}44`;
                  return (
                    <div key={`${p}-${im}`} style={{ background:cellBg, border:`1px solid ${cellBd}`, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexWrap:'wrap', gap:4, padding:4 }}>
                      {rs.length > 0
                        ? rs.map((r: Risk) => (
                          <div key={r.id}
                            title={r.title}
                            onClick={() => setDetail(r)}
                            style={{ width:20, height:20, borderRadius:'50%', background:sevColor(severity(r)), cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff' }}>
                            {score(r)}
                          </div>
                        ))
                        : <span style={{ fontSize:9, color:C.t3 }}>{sc}</span>
                      }
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:3, marginTop:6 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ flex:1, textAlign:'center', fontSize:10, color:C.t2, fontWeight:600 }}>{i}</div>
                ))}
              </div>
              <div style={{ textAlign:'center', fontSize:10, color:C.t2, marginTop:4 }}>Impact →</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:16, marginTop:16, flexWrap:'wrap' }}>
            {[
              { label:'Critical (≥20)', col:C.red   },
              { label:'High (12–19)',   col:C.amber  },
              { label:'Medium (6–11)',  col:C.blue   },
              { label:'Low (1–5)',      col:C.green  },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.t2 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:l.col }} />
                {l.label}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── REGULATORY PLANNER TAB ────────────────────────────────────────────────────

function RegulatoryPlannerTab() {
  const { data: projects = [] } = useProjects();
  const createRisk       = useCreateRisk();
  const analyzeMutation  = useAnalyzeRegulations();
  const [state, setState]     = useState('Virginia');
  const [locality, setLocality] = useState('');
  const [selTypes, setSelTypes] = useState<WorkTypeId[]>([]);
  const [projDesc, setProjDesc] = useState('');
  const [projId, setProjId]     = useState('');
  const [result, setResult]     = useState<any>(null);
  const [imported, setImported] = useState<Record<number, boolean>>({});

  const toggle = (id: WorkTypeId) =>
    setSelTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const analyze = async () => {
    const data = await analyzeMutation.mutateAsync({
      state, workTypes: selTypes, projectDescription: projDesc, locality,
      projectId: projId || undefined,
    });
    setResult(data);
  };

  const importRisk = async (flag: any, idx: number) => {
    if (imported[idx] || !projId) return;
    await createRisk.mutateAsync({
      projectId: projId, title: flag.title, category: 'Regulatory' as RiskCategory,
      probability: flag.probability || 3, impact: flag.impact || 4,
      status: 'Open' as RiskStatus, mitigation: flag.mitigation || '', owner: 'Unassigned',
    } as any);
    setImported(prev => ({ ...prev, [idx]: true }));
  };

  const sevColor2 = (s: string) => s === 'Critical' ? C.red : s === 'High' ? C.amber : C.teal;
  const sevBg2    = (s: string) => s === 'Critical' ? C.redBg : s === 'High' ? C.amberBg : C.tealBg;
  const riskColor = (sc: number) => sc >= 15 ? C.red : sc >= 8 ? C.amber : C.green;

  return (
    <div>
      <Card style={{ padding:20, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:500, color:C.t0, marginBottom:4 }}>Regulatory compliance planner</div>
        <div style={{ fontSize:12, color:C.t2, marginBottom:16 }}>Select work types and location to get AI-powered regulatory guidance.</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
          <Field label="State">
            <Sel value={state} onChange={e => setState(e.target.value)} style={{ width:'100%' }}>
              {US_STATES.map(s => <option key={s}>{s}</option>)}
            </Sel>
          </Field>
          <Field label="City / county (optional)">
            <Inp value={locality} onChange={e => setLocality(e.target.value)} placeholder="e.g. Arlington" />
          </Field>
          <Field label="Link to project">
            <Sel value={projId} onChange={e => setProjId(e.target.value)} style={{ width:'100%' }}>
              <option value="">None</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Sel>
          </Field>
        </div>
        <Field label="Project description">
          <Textarea value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Describe scope briefly…" style={{ minHeight:56 }} />
        </Field>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:600, color:C.t2, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Work types</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {WORK_TYPES.map(wt => {
              const sel = selTypes.includes(wt.id);
              return (
                <div key={wt.id} onClick={() => toggle(wt.id)} style={{ background:sel ? C.blueBg : C.bg3, border:`1.5px solid ${sel ? C.blue : C.bd}`, borderRadius:9, padding:'10px 12px', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:12, fontWeight:500, color:sel ? C.blue : C.t0 }}>{wt.label}</span>
                    {sel && <span style={{ marginLeft:'auto', width:14, height:14, borderRadius:'50%', background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#fff', fontWeight:700 }}>✓</span>}
                  </div>
                  <div style={{ fontSize:10, color:C.t2, lineHeight:1.4 }}>{wt.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
        {analyzeMutation.error && (
          <div style={{ background:C.redBg, border:`1px solid ${C.red}44`, borderRadius:8, padding:'10px 14px', fontSize:12, color:C.red, marginBottom:12 }}>
            {String(analyzeMutation.error)}
          </div>
        )}
        <Btn variant="primary" loading={analyzeMutation.isPending} onClick={analyze} disabled={!selTypes.length}>
          {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze regulatory requirements'}
        </Btn>
      </Card>

      {result && (
        <div>
          <div style={{ background:C.blueBg, border:`1px solid ${C.blue}44`, borderRadius:12, padding:'16px 20px', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.blue, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Compliance overview — {state}</div>
            <div style={{ fontSize:13, color:C.t0, lineHeight:1.6 }}>{result.summary}</div>
          </div>

          {(result.recommendedActions || []).length > 0 && (
            <Card style={{ padding:'16px 20px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.t2, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>Recommended actions</div>
              {result.recommendedActions.map((a: string, i: number) => (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:C.blueBg, border:`1px solid ${C.blue}`, color:C.blue, fontSize:10, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                  <span style={{ fontSize:12, color:C.t0, lineHeight:1.5 }}>{a}</span>
                </div>
              ))}
            </Card>
          )}

          {(result.permits || []).length > 0 && (
            <Card style={{ overflow:'hidden', marginBottom:14 }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.bd}`, background:C.bg1 }}>
                <span style={{ fontSize:12, fontWeight:500, color:C.t0 }}>Required permits and licenses</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${C.bd}` }}>
                      {['Severity','Permit','Authority','Lead time','Est. cost','Notes'].map(h => (
                        <th key={h} style={{ padding:'9px 12px', textAlign:'left', color:C.t2, fontWeight:600, fontSize:10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.permits.map((p: any, i: number) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${C.bd}` }}>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ background:sevBg2(p.severity), color:sevColor2(p.severity), fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4 }}>{p.severity}</span>
                        </td>
                        <td style={{ padding:'10px 12px', fontWeight:500, color:C.t0 }}>{p.permitName}</td>
                        <td style={{ padding:'10px 12px', color:C.t1 }}>{p.issuingAuthority}</td>
                        <td style={{ padding:'10px 12px', color:C.amber, fontSize:11 }}>{p.typicalLeadTime}</td>
                        <td style={{ padding:'10px 12px', color:C.green, fontSize:11 }}>{p.estimatedCost}</td>
                        <td style={{ padding:'10px 12px', color:C.t2, fontSize:11 }}>{p.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {(result.riskFlags || []).length > 0 && (
            <Card style={{ overflow:'hidden', marginBottom:14 }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.bd}`, background:C.bg1, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, fontWeight:500, color:C.t0 }}>Regulatory risk flags</span>
                <Btn small style={{ marginLeft:'auto' }}
                  onClick={() => result.riskFlags.forEach((f: any, i: number) => importRisk(f, i))}>
                  Import all
                </Btn>
              </div>
              <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                {result.riskFlags.map((flag: any, i: number) => {
                  const sc = (flag.probability || 3) * (flag.impact || 4);
                  const rc = riskColor(sc);
                  return (
                    <div key={i} style={{ background:C.bg3, border:`1px solid ${C.bd}`, borderRadius:10, padding:'13px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:26, height:26, borderRadius:6, background:`${rc}22`, border:`1.5px solid ${rc}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:rc }}>{sc}</div>
                          <span style={{ fontSize:13, fontWeight:500, color:C.t0 }}>{flag.title}</span>
                        </div>
                        <Btn small variant={imported[i] ? 'ghost' : 'primary'}
                          onClick={() => importRisk(flag, i)} disabled={imported[i] || !projId}>
                          {imported[i] ? '✓ Imported' : '→ Add to register'}
                        </Btn>
                      </div>
                      <div style={{ fontSize:11, color:C.t1, marginBottom:6 }}>{flag.description}</div>
                      <div style={{ background:C.bg2, borderRadius:6, padding:'7px 10px', fontSize:11, color:C.teal }}>
                        Mitigation: {flag.mitigation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div style={{ background:C.amberBg, border:`1px solid ${C.amber}33`, borderRadius:10, padding:'12px 16px', fontSize:11, color:C.amber, lineHeight:1.6 }}>
            Disclaimer: AI-generated guidance. Verify with the state licensing board, local AHJ, and a licensed attorney before work begins.
          </div>
        </div>
      )}
    </div>
  );
}

// ── RISK MODULE ───────────────────────────────────────────────────────────────

export function RiskModule() {
  const [tab, setTab] = useState('register');
  return (
    <div>
      <SectionHdr title="Risk register" />
      <TabBar
        tabs={[['register','Risk register'],['regulatory','Regulatory planner']]}
        active={tab}
        onSet={setTab}
      />
      {tab === 'register'   && <RiskRegisterTab />}
      {tab === 'regulatory' && <RegulatoryPlannerTab />}
    </div>
  );
}
