import { useState } from 'react';
import { C, SectionHdr, TabBar, Card, Btn, Modal, Field, Inp, Sel, Textarea, Chip, StatCard, Spinner, Empty } from '../../components/ui';
import { useRisks, useProjects, useCreateRisk, useAnalyzeRegulations } from '../../hooks/useData';
import { useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api';
import type { WorkTypeId } from '../../lib/types';

const WORK_TYPES = [
  { id:'network_cabling' as WorkTypeId, label:'Network Cabling',   desc:'Cat5e/6/6A, IDF/MDF, plenum' },
  { id:'trenching'       as WorkTypeId, label:'Trenching',          desc:'Underground conduit, boring'   },
  { id:'aerial_cable'    as WorkTypeId, label:'Aerial Cable',       desc:'Pole attachment, NESC'         },
  { id:'fiber'           as WorkTypeId, label:'Fiber Optic',        desc:'OSP/ISP, splicing, OTDR'       },
  { id:'access_control'  as WorkTypeId, label:'Access Control',     desc:'Controllers, card readers'     },
  { id:'surveillance'    as WorkTypeId, label:'Surveillance/CCTV',  desc:'IP cameras, NVR, audio'        },
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

function riskScore(r: any) { return r.probability * r.impact; }
function riskColor(s: number) { return s >= 15 ? C.red : s >= 8 ? C.amber : C.green; }
function sevColor(s: string) { return s === 'Critical' ? C.red : s === 'High' ? C.amber : C.teal; }
function sevBg(s: string)    { return s === 'Critical' ? C.redBg : s === 'High' ? C.amberBg : C.tealBg; }

// ── RISK REGISTER ─────────────────────────────────────────────────────────────
function RiskRegisterTab() {
  const { data: risks = [], isLoading } = useRisks();
  const { data: projects = [] } = useProjects();
  const createRisk = useCreateRisk();
  const api = useApiClient();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ projectId:'', title:'', category:'Scope', probability:3, impact:3, status:'Open', mitigation:'', linkedProposal:'', owner:'' });

  const matrix = Array.from({ length:5 }, (_, i) => Array.from({ length:5 }, (_, j) => {
    const p = 5 - i, im = j + 1, sc = p * im;
    const rs = risks.filter((r: any) => r.probability === p && r.impact === im);
    return { p, im, sc, rs };
  }));

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>;

  return (
    <div>
      {showAdd && (
        <Modal title="Add Risk" onClose={() => setShowAdd(false)}>
          <Field label="Project">
            <Sel value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Select project…</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Sel>
          </Field>
          <Field label="Risk Title"><Inp value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Describe the risk…" /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Category">
              <Sel value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['Scope','Resource','Technical','Commercial','Security','Supply Chain','Vendor','Regulatory'].map(x => <option key={x}>{x}</option>)}
              </Sel>
            </Field>
            <Field label="Owner"><Inp value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="Assignee name" /></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label={`Probability ${form.probability}/5`}><input type="range" min={1} max={5} value={form.probability} onChange={e => setForm({ ...form, probability: Number(e.target.value) })} style={{ width:'100%', accentColor:C.blue }} /></Field>
            <Field label={`Impact ${form.impact}/5`}><input type="range" min={1} max={5} value={form.impact} onChange={e => setForm({ ...form, impact: Number(e.target.value) })} style={{ width:'100%', accentColor:C.red }} /></Field>
          </div>
          <Field label="Mitigation"><Textarea value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })} placeholder="Mitigation plan…" /></Field>
          <Field label="Linked Proposal"><Inp value={form.linkedProposal} onChange={e => setForm({ ...form, linkedProposal: e.target.value })} placeholder="Optional proposal name" /></Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" loading={createRisk.isPending} onClick={async () => { await createRisk.mutateAsync(form as any); setShowAdd(false); }}>Add Risk</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}><Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add Risk</Btn></div>

      {/* Matrix */}
      <Card style={{ padding:20, marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.t2, letterSpacing:'0.08em', marginBottom:12 }}>PROBABILITY × IMPACT MATRIX</div>
        <div style={{ display:'flex', gap:2 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:2, marginRight:8 }}>
            {[5,4,3,2,1].map(p => <div key={p} style={{ height:44, display:'flex', alignItems:'center', justifyContent:'flex-end', fontSize:10, color:C.t2, fontWeight:600, width:20 }}>{p}</div>)}
            <div style={{ height:20 }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'grid', gridTemplateRows:'repeat(5,44px)', gridTemplateColumns:'repeat(5,1fr)', gap:2 }}>
              {matrix.flat().map(({ p, im, sc, rs }) => {
                const bg = sc >= 15 ? '#2a0a0a' : sc >= 9 ? '#1f1509' : sc >= 5 ? '#0a1208' : C.bg3;
                const bd = sc >= 15 ? C.red+'60' : sc >= 9 ? C.amber+'60' : sc >= 5 ? C.green+'40' : C.bd;
                return (
                  <div key={`${p}-${im}`} style={{ background:bg, border:`1px solid ${bd}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:2 }}>
                    {rs.length > 0 ? rs.map((r: any) => <div key={r.id} style={{ width:8, height:8, borderRadius:'50%', background:riskColor(sc), boxShadow:`0 0 4px ${riskColor(sc)}` }} title={r.title} />) : <span style={{ fontSize:9, color:C.t3 }}>{sc}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:2, marginTop:4 }}>{[1,2,3,4,5].map(i => <div key={i} style={{ flex:1, textAlign:'center', fontSize:10, color:C.t2, fontWeight:600 }}>{i}</div>)}</div>
            <div style={{ textAlign:'center', fontSize:10, color:C.t2, marginTop:2 }}>Impact →</div>
          </div>
        </div>
      </Card>

      {!risks.length && <Empty icon="✅" message="No risks logged" sub="Add risks to start tracking them on the matrix" />}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {[...risks].sort((a: any, b: any) => riskScore(b) - riskScore(a)).map((r: any) => {
          const sc = riskScore(r), col = riskColor(sc);
          const proj = projects.find((p: any) => p.id === r.projectId);
          return (
            <Card key={r.id} style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <div style={{ width:28, height:28, borderRadius:6, background:col+'22', border:`1.5px solid ${col}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:col, fontFamily:'JetBrains Mono,monospace' }}>{sc}</div>
                    <span style={{ fontSize:13, fontWeight:700, color:C.t0 }}>{r.title}</span>
                    {r.category === 'Regulatory' && <span style={{ background:C.purpleBg, color:C.purple, border:`1px solid ${C.purple}33`, fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4 }}>⚖️ REGULATORY</span>}
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <Chip label={r.status} size={10} />
                    <span style={{ fontSize:10, color:C.t2 }}>{r.category} · {proj?.name || r.projectId} · {r.owner} · {r.raisedAt?.slice(0,10)}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:12 }}>
                  <Sel value={r.status} onChange={async e => { await api.patch(`/risks/${r.id}`, { status: e.target.value }); qc.invalidateQueries({ queryKey: ['risks'] }); }} style={{ fontSize:10, padding:'3px 6px', width:'auto' }}>
                    {['Open','Watching','Accepted','Closed'].map(x => <option key={x}>{x}</option>)}
                  </Sel>
                  <button onClick={async () => { await api.delete(`/risks/${r.id}`); qc.invalidateQueries({ queryKey: ['risks'] }); }} style={{ background:'none', border:'none', color:C.t3, cursor:'pointer', fontSize:16 }}>×</button>
                </div>
              </div>
              <div style={{ background:C.bg3, borderRadius:6, padding:'8px 12px', fontSize:11, color:C.t1 }}>
                <span style={{ color:C.t2, fontWeight:600 }}>Mitigation: </span>{r.mitigation || '—'}
              </div>
              {r.linkedProposal && (
                <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                  <span style={{ background:C.purpleBg, color:C.purple, border:`1px solid ${C.purple}33`, borderRadius:5, padding:'2px 8px', fontWeight:600 }}>📎 Linked Proposal</span>
                  <span style={{ color:C.purple }}>{r.linkedProposal}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── REGULATORY PLANNER ────────────────────────────────────────────────────────
function RegulatoryPlannerTab() {
  const { data: projects = [] } = useProjects();
  const createRisk = useCreateRisk();
  const analyzeMutation = useAnalyzeRegulations();
  const [state, setState] = useState('Virginia');
  const [locality, setLocality] = useState('');
  const [selTypes, setSelTypes] = useState<WorkTypeId[]>([]);
  const [projDesc, setProjDesc] = useState('');
  const [projId, setProjId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [imported, setImported] = useState<Record<number, boolean>>({});

  const toggle = (id: WorkTypeId) => setSelTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const analyze = async () => {
    const data = await analyzeMutation.mutateAsync({ state, workTypes: selTypes, projectDescription: projDesc, locality, projectId: projId || undefined });
    setResult(data);
  };

  const importRisk = async (flag: any, idx: number) => {
    if (imported[idx]) return;
    await createRisk.mutateAsync({ projectId: projId, title: flag.title, category: 'Regulatory' as any, probability: flag.probability || 3, impact: flag.impact || 4, status: 'Open' as any, mitigation: flag.mitigation || '', owner: 'Unassigned' });
    setImported(prev => ({ ...prev, [idx]: true }));
  };

  return (
    <div>
      <Card style={{ padding:20, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.t0, marginBottom:4 }}>Regulatory Compliance Planner</div>
        <div style={{ fontSize:12, color:C.t2, marginBottom:16 }}>Select work types and location to get AI-powered regulatory guidance.</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
          <Field label="State"><Sel value={state} onChange={e => setState(e.target.value)} style={{ width:'100%' }}>{US_STATES.map(s => <option key={s}>{s}</option>)}</Sel></Field>
          <Field label="City / County (optional)"><Inp value={locality} onChange={e => setLocality(e.target.value)} placeholder="e.g. Arlington" /></Field>
          <Field label="Link to Project"><Sel value={projId} onChange={e => setProjId(e.target.value)} style={{ width:'100%' }}><option value="">None</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}</Sel></Field>
        </div>
        <Field label="Project Description">
          <Textarea value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Describe scope briefly…" style={{ minHeight:56 }} />
        </Field>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.t2, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Work Types</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {WORK_TYPES.map(wt => {
              const sel = selTypes.includes(wt.id);
              return (
                <div key={wt.id} onClick={() => toggle(wt.id)} style={{ background:sel ? C.blueBg : C.bg3, border:`1.5px solid ${sel ? C.blue : C.bd}`, borderRadius:9, padding:'10px 12px', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:sel ? C.blue : C.t0 }}>{wt.label}</span>
                    {sel && <span style={{ marginLeft:'auto', width:14, height:14, borderRadius:'50%', background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#fff', fontWeight:800 }}>✓</span>}
                  </div>
                  <div style={{ fontSize:10, color:C.t2, lineHeight:1.4 }}>{wt.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
        {analyzeMutation.error && (
          <div style={{ background:C.redBg, border:`1px solid ${C.red}44`, borderRadius:8, padding:'10px 14px', fontSize:12, color:C.red, marginBottom:12 }}>{String(analyzeMutation.error)}</div>
        )}
        <Btn variant="primary" loading={analyzeMutation.isPending} onClick={analyze} disabled={!selTypes.length}>
          {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze Regulatory Requirements'}
        </Btn>
      </Card>

      {result && (
        <div>
          <div style={{ background:C.blueBg, border:`1px solid ${C.blue}44`, borderRadius:12, padding:'16px 20px', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.blue, letterSpacing:'0.08em', marginBottom:6 }}>COMPLIANCE OVERVIEW — {state.toUpperCase()}</div>
            <div style={{ fontSize:13, color:C.t0, lineHeight:1.6 }}>{result.summary}</div>
          </div>

          {(result.recommendedActions || []).length > 0 && (
            <Card style={{ padding:'16px 20px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.t2, letterSpacing:'0.08em', marginBottom:12 }}>RECOMMENDED ACTIONS</div>
              {result.recommendedActions.map((a: string, i: number) => (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:C.blueBg, border:`1px solid ${C.blue}`, color:C.blue, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                  <span style={{ fontSize:12, color:C.t0, lineHeight:1.5 }}>{a}</span>
                </div>
              ))}
            </Card>
          )}

          {(result.permits || []).length > 0 && (
            <Card style={{ overflow:'hidden', marginBottom:14 }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.bd}`, background:C.bg1 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.t0 }}>Required Permits and Licenses</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr style={{ borderBottom:`1px solid ${C.bd}` }}>
                    {['Severity','Permit','Authority','Lead Time','Est. Cost','Notes'].map(h => <th key={h} style={{ padding:'9px 12px', textAlign:'left', color:C.t2, fontWeight:600, fontSize:10 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {result.permits.map((p: any, i: number) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${C.bd}` }}>
                        <td style={{ padding:'10px 12px' }}><span style={{ background:sevBg(p.severity), color:sevColor(p.severity), fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4 }}>{p.severity}</span></td>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:C.t0 }}>{p.permitName}</td>
                        <td style={{ padding:'10px 12px', color:C.t1 }}>{p.issuingAuthority}</td>
                        <td style={{ padding:'10px 12px', color:C.amber, fontFamily:'JetBrains Mono,monospace', fontSize:11 }}>{p.typicalLeadTime}</td>
                        <td style={{ padding:'10px 12px', color:C.green, fontFamily:'JetBrains Mono,monospace', fontSize:11 }}>{p.estimatedCost}</td>
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
                <span style={{ fontSize:12, fontWeight:700, color:C.t0 }}>Regulatory Risk Flags</span>
                <Btn small style={{ marginLeft:'auto' }} onClick={() => result.riskFlags.forEach((f: any, i: number) => importRisk(f, i))}>Import All</Btn>
              </div>
              <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                {result.riskFlags.map((flag: any, i: number) => {
                  const sc = (flag.probability || 3) * (flag.impact || 4), rc = riskColor(sc);
                  return (
                    <div key={i} style={{ background:C.bg3, border:`1px solid ${C.bd}`, borderRadius:10, padding:'13px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:26, height:26, borderRadius:6, background:rc+'22', border:`1.5px solid ${rc}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:rc, fontFamily:'JetBrains Mono,monospace' }}>{sc}</div>
                          <span style={{ fontSize:13, fontWeight:700, color:C.t0 }}>{flag.title}</span>
                        </div>
                        <Btn small variant={imported[i] ? 'ghost' : 'primary'} onClick={() => importRisk(flag, i)} disabled={imported[i]}>
                          {imported[i] ? '✓ Imported' : '→ Add to Register'}
                        </Btn>
                      </div>
                      <div style={{ fontSize:11, color:C.t1, marginBottom:6 }}>{flag.description}</div>
                      <div style={{ background:C.bg2, borderRadius:6, padding:'7px 10px', fontSize:11, color:C.teal }}>Mitigation: {flag.mitigation}</div>
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
      <SectionHdr title="Risk Register" />
      <TabBar tabs={[['register','Risk Register'],['regulatory','Regulatory Planner']]} active={tab} onSet={setTab} />
      {tab === 'register'   && <RiskRegisterTab />}
      {tab === 'regulatory' && <RegulatoryPlannerTab />}
    </div>
  );
}
