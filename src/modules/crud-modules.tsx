import { useState } from 'react';
import { C, SectionHdr, Card, Btn, Modal, Field, Inp, Sel, Textarea, Chip, StatCard, Spinner, Empty, BudgetBar } from '../components/ui';
import { useLessons, useSchedule, useProcurement, useChecklist, useProjects, useEngineers } from '../hooks/useData';
import { useApiClient } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

// ── LESSONS MODULE ────────────────────────────────────────────────────────────
export function LessonsModule() {
  const { data: lessons = [], isLoading } = useLessons();
  const { data: projects = [] } = useProjects();
  const api = useApiClient();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ projectId:'', date:new Date().toISOString().slice(0,10), category:'Technical', what:'', impact:'Negative', recommendation:'', addedByName:'' });

  const CATS = ['All','Planning','Technical','Communication','Vendor','Security','Scope'];
  const filtered = filter === 'All' ? lessons : lessons.filter((l: any) => l.category === filter);

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>;

  return (
    <div>
      {showAdd && (
        <Modal title="Add Lesson Learned" onClose={() => setShowAdd(false)}>
          <Field label="Project"><Sel value={form.projectId} onChange={e => setForm({ ...form, projectId:e.target.value })}><option value="">Select project…</option>{projects.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Sel></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Date"><Inp type="date" value={form.date} onChange={e => setForm({ ...form, date:e.target.value })} /></Field>
            <Field label="Category"><Sel value={form.category} onChange={e => setForm({ ...form, category:e.target.value })}>{CATS.slice(1).map(x => <option key={x}>{x}</option>)}</Sel></Field>
          </div>
          <Field label="What Happened"><Textarea value={form.what} onChange={e => setForm({ ...form, what:e.target.value })} placeholder="Describe what happened…" /></Field>
          <Field label="Impact"><Sel value={form.impact} onChange={e => setForm({ ...form, impact:e.target.value })}><option>Positive</option><option>Negative</option><option>Neutral</option></Sel></Field>
          <Field label="Recommendation"><Textarea value={form.recommendation} onChange={e => setForm({ ...form, recommendation:e.target.value })} placeholder="What should future projects do differently?" /></Field>
          <Field label="Added By"><Inp value={form.addedByName} onChange={e => setForm({ ...form, addedByName:e.target.value })} placeholder="Your name" /></Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={async () => { await api.post('/lessons', form); qc.invalidateQueries({ queryKey:['lessons'] }); setShowAdd(false); }}>Save</Btn>
          </div>
        </Modal>
      )}
      <SectionHdr title="Lessons Learned" count={lessons.length} action={<Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add Lesson</Btn>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        <StatCard label="Total" value={lessons.length} color={C.blue} />
        <StatCard label="Positive" value={lessons.filter((l:any) => l.impact==='Positive').length} color={C.green} />
        <StatCard label="Negative" value={lessons.filter((l:any) => l.impact==='Negative').length} color={C.red} />
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {CATS.map(c => <button key={c} onClick={() => setFilter(c)} style={{ background:filter===c ? C.blue : C.bg3, border:`1px solid ${filter===c ? C.blue : C.bd}`, borderRadius:6, padding:'4px 12px', color:filter===c ? '#fff' : C.t1, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{c}</button>)}
      </div>
      {!filtered.length && <Empty icon="💡" message="No lessons logged" sub="Add lessons to build institutional knowledge" />}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map((l: any) => {
          const proj = projects.find((p:any) => p.id === l.projectId);
          return (
            <Card key={l.id} style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  <Chip label={l.impact} /><Chip label={l.category} />
                  <span style={{ fontSize:11, color:C.t2 }}>{proj?.name || l.projectId} · {l.date?.slice(0,10)}</span>
                </div>
                <button onClick={async () => { await api.delete(`/lessons/${l.id}`); qc.invalidateQueries({ queryKey:['lessons'] }); }} style={{ background:'none', border:'none', color:C.t3, cursor:'pointer', fontSize:16 }}>×</button>
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:C.t0, marginBottom:8 }}>{l.what}</div>
              <div style={{ background:C.bg3, borderRadius:6, padding:'8px 12px', fontSize:11, color:C.t1 }}>
                <span style={{ color:C.teal, fontWeight:600 }}>Recommendation: </span>{l.recommendation}
              </div>
              {l.addedByName && <div style={{ fontSize:11, color:C.t2, marginTop:8 }}>Added by {l.addedByName}</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── SCHEDULE MODULE ───────────────────────────────────────────────────────────
const PHASE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#a78bfa','#14b8a6'];

export function ScheduleModule() {
  const { data: projects = [] } = useProjects();
  const [selProj, setSelProj] = useState('');
  const { data: phases = [], isLoading } = useSchedule(selProj || undefined);
  const api = useApiClient();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ projectId:'', phase:'', startDate:'', endDate:'', status:'Upcoming', owner:'', isMilestone:false });

  const pid = selProj || (projects[0]?.id || '');
  const filtered = phases.filter((s:any) => s.projectId === pid);
  const allStart = filtered.length ? new Date(Math.min(...filtered.map((s:any) => new Date(s.startDate).getTime()))) : new Date();
  const allEnd   = filtered.length ? new Date(Math.max(...filtered.map((s:any) => new Date(s.endDate).getTime()))) : new Date();
  const totalMs  = Math.max(allEnd.getTime() - allStart.getTime(), 1);
  const pct  = (d: string) => ((new Date(d).getTime() - allStart.getTime()) / totalMs) * 100;
  const wPct = (s: string, e: string) => Math.max(((new Date(e).getTime() - new Date(s).getTime()) / totalMs) * 100, 1.5);

  return (
    <div>
      {showAdd && (
        <Modal title="Add Schedule Phase" onClose={() => setShowAdd(false)}>
          <Field label="Project"><Sel value={form.projectId} onChange={e => setForm({ ...form, projectId:e.target.value })}><option value="">Select project…</option>{projects.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Sel></Field>
          <Field label="Phase Name"><Inp value={form.phase} onChange={e => setForm({ ...form, phase:e.target.value })} placeholder="e.g. Core Deployment" /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Start"><Inp type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate:e.target.value })} /></Field>
            <Field label="End">  <Inp type="date" value={form.endDate}   onChange={e => setForm({ ...form, endDate:e.target.value })} /></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Status"><Sel value={form.status} onChange={e => setForm({ ...form, status:e.target.value })}>{['Upcoming','In Progress','Done','Delayed'].map(x => <option key={x}>{x}</option>)}</Sel></Field>
            <Field label="Owner"><Inp value={form.owner} onChange={e => setForm({ ...form, owner:e.target.value })} placeholder="Name" /></Field>
          </div>
          <Field label="Milestone"><label style={{ display:'flex', gap:8, alignItems:'center', cursor:'pointer', fontSize:12, color:C.t1 }}><input type="checkbox" checked={form.isMilestone} onChange={e => setForm({ ...form, isMilestone:e.target.checked })} style={{ accentColor:C.blue }} />Mark as milestone</label></Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={async () => { await api.post('/schedule', { ...form, dependencies:[] }); qc.invalidateQueries({ queryKey:['schedule'] }); setShowAdd(false); }}>Add Phase</Btn>
          </div>
        </Modal>
      )}
      <SectionHdr title="Executive Schedule and Dependencies" action={<Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add Phase</Btn>} />
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {projects.map((p:any) => <button key={p.id} onClick={() => setSelProj(p.id)} style={{ background:pid===p.id ? C.blueBg : C.bg3, border:`1px solid ${pid===p.id ? C.blue : C.bd}`, borderRadius:7, padding:'6px 14px', color:pid===p.id ? C.blue : C.t1, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{p.id}</button>)}
      </div>
      {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div> : (
        <>
          <Card style={{ overflow:'hidden', marginBottom:16 }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.bd}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.t0 }}>{projects.find((p:any) => p.id === pid)?.name || ''}</div>
              <div style={{ fontSize:11, color:C.t2, marginTop:2 }}>{allStart.toDateString()} → {allEnd.toDateString()}</div>
            </div>
            <div style={{ padding:'16px 18px' }}>
              {!filtered.length && <Empty icon="📅" message="No phases yet" sub="Add phases to build the Gantt chart" />}
              {filtered.map((s:any, i:number) => (
                <div key={s.id} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {s.isMilestone && <span>◆</span>}
                      <span style={{ fontSize:12, fontWeight:600, color:C.t0 }}>{s.phase}</span>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontSize:10, color:C.t2 }}>{s.startDate?.slice(0,10)} → {s.endDate?.slice(0,10)}</span>
                      <Chip label={s.status} size={10} />
                      <button onClick={async () => { await api.delete(`/schedule/${s.id}`); qc.invalidateQueries({ queryKey:['schedule'] }); }} style={{ background:'none', border:'none', color:C.t3, cursor:'pointer', fontSize:14 }}>×</button>
                    </div>
                  </div>
                  <div style={{ background:C.bg3, borderRadius:6, height:28, position:'relative' }}>
                    <div style={{ position:'absolute', left:`${pct(s.startDate)}%`, width:`${wPct(s.startDate,s.endDate)}%`, height:'100%', background:PHASE_COLORS[i%PHASE_COLORS.length]+'55', border:`1.5px solid ${PHASE_COLORS[i%PHASE_COLORS.length]}`, borderRadius:6, display:'flex', alignItems:'center', paddingLeft:8, minWidth:s.isMilestone?12:'auto' }}>
                      {!s.isMilestone && <span style={{ fontSize:10, color:'#fff', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.owner}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          {filtered.filter((s:any) => (s.dependencies||[]).length > 0).length > 0 && (
            <Card style={{ overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.bd}`, fontSize:12, fontWeight:700, color:C.t1 }}>DEPENDENCY MAP</div>
              {filtered.filter((s:any) => (s.dependencies||[]).length > 0).map((s:any) => {
                const deps = (s.dependencies||[]).map((id:string) => filtered.find((x:any) => x.id === id)).filter(Boolean);
                return (
                  <div key={s.id} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.bd}`, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    {deps.map((dep:any) => <span key={dep.id} style={{ background:C.bg3, color:C.t1, border:`1px solid ${C.bd}`, borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:600 }}>{dep.phase}</span>)}
                    <span style={{ fontSize:12, color:C.t2 }}>→</span>
                    <span style={{ background:C.blueBg, color:C.blue, border:`1px solid ${C.blue}33`, borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{s.phase}</span>
                  </div>
                );
              })}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── PROCUREMENT MODULE ────────────────────────────────────────────────────────
export function ProcurementModule() {
  const { data: proc = [], isLoading } = useProcurement();
  const { data: projects = [] } = useProjects();
  const api = useApiClient();
  const qc = useQueryClient();
  const [fp, setFp] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ projectId:'', item:'', vendor:'', qty:1, unitCost:0, status:'Pending PO', orderedAt:'', eta:'', poNumber:'', notes:'' });

  const filtered = fp === 'All' ? proc : proc.filter((p:any) => p.projectId === fp);
  const total = filtered.reduce((s:number, p:any) => s + p.qty * p.unitCost, 0);

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>;

  return (
    <div>
      {showAdd && (
        <Modal title="Add Procurement Item" onClose={() => setShowAdd(false)}>
          <Field label="Project"><Sel value={form.projectId} onChange={e => setForm({ ...form, projectId:e.target.value })}><option value="">Select project…</option>{projects.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Sel></Field>
          <Field label="Item"><Inp value={form.item} onChange={e => setForm({ ...form, item:e.target.value })} placeholder="e.g. Cisco Catalyst 9300" /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Vendor"><Inp value={form.vendor} onChange={e => setForm({ ...form, vendor:e.target.value })} /></Field>
            <Field label="Status"><Sel value={form.status} onChange={e => setForm({ ...form, status:e.target.value })}>{['Pending PO','On Order','In Transit','Delivered','Provisioned','Backordered'].map(x => <option key={x}>{x}</option>)}</Sel></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Qty"><Inp type="number" value={String(form.qty)} onChange={e => setForm({ ...form, qty:Number(e.target.value) })} /></Field>
            <Field label="Unit Cost ($)"><Inp type="number" value={String(form.unitCost)} onChange={e => setForm({ ...form, unitCost:Number(e.target.value) })} /></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Order Date"><Inp type="date" value={form.orderedAt} onChange={e => setForm({ ...form, orderedAt:e.target.value })} /></Field>
            <Field label="ETA"><Inp type="date" value={form.eta} onChange={e => setForm({ ...form, eta:e.target.value })} /></Field>
          </div>
          <Field label="PO Number"><Inp value={form.poNumber} onChange={e => setForm({ ...form, poNumber:e.target.value })} placeholder="PO-2026-XXX" /></Field>
          <Field label="Notes"><Inp value={form.notes} onChange={e => setForm({ ...form, notes:e.target.value })} /></Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={async () => { await api.post('/procurement', form); qc.invalidateQueries({ queryKey:['procurement'] }); setShowAdd(false); }}>Add</Btn>
          </div>
        </Modal>
      )}
      <SectionHdr title="Procurement Visibility" count={`${filtered.length} items`} action={<Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add Item</Btn>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        <StatCard label="Total Value" value={`$${total.toLocaleString()}`} color={C.blue} />
        <StatCard label="Delivered"   value={filtered.filter((p:any) => ['Delivered','Provisioned'].includes(p.status)).length} color={C.green} />
        <StatCard label="In Transit"  value={filtered.filter((p:any) => ['In Transit','On Order'].includes(p.status)).length} color={C.amber} />
        <StatCard label="Pending PO"  value={filtered.filter((p:any) => p.status === 'Pending PO').length} color={C.red} />
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {['All',...projects.map((p:any) => p.id)].map(id => <button key={id} onClick={() => setFp(id)} style={{ background:fp===id ? C.blue : C.bg3, border:`1px solid ${fp===id ? C.blue : C.bd}`, borderRadius:6, padding:'4px 12px', color:fp===id ? '#fff' : C.t1, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{id}</button>)}
      </div>
      <Card style={{ overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ borderBottom:`1px solid ${C.bd}` }}>{['PO','Item','Vendor','Qty','Unit','Total','ETA','Status','Notes'].map(h => <th key={h} style={{ padding:'9px 12px', textAlign:'left', color:C.t2, fontWeight:600, fontSize:10, whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((p:any) => (
                <tr key={p.id} style={{ borderBottom:`1px solid ${C.bd}` }}>
                  <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono,monospace', color:C.blue, fontSize:11 }}>{p.poNumber || '—'}</td>
                  <td style={{ padding:'10px 12px', fontWeight:700, color:C.t0 }}>{p.item}</td>
                  <td style={{ padding:'10px 12px', color:C.t1 }}>{p.vendor}</td>
                  <td style={{ padding:'10px 12px', color:C.t1, textAlign:'center' }}>{p.qty}</td>
                  <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono,monospace', color:C.t1 }}>${p.unitCost.toLocaleString()}</td>
                  <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono,monospace', fontWeight:600, color:C.t0 }}>${(p.qty*p.unitCost).toLocaleString()}</td>
                  <td style={{ padding:'10px 12px', color:C.t1, whiteSpace:'nowrap' }}>{p.eta ? new Date(p.eta).toLocaleDateString() : '—'}</td>
                  <td style={{ padding:'10px 12px' }}><Chip label={p.status} size={10} /></td>
                  <td style={{ padding:'10px 12px', color:p.notes ? C.amber : C.t3, fontSize:11, maxWidth:140 }}>{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ borderTop:`1px solid ${C.bd}` }}>
              <td colSpan={5} style={{ padding:'10px 12px', fontSize:11, color:C.t2, fontWeight:600 }}>TOTAL ({filtered.length} items)</td>
              <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono,monospace', fontWeight:700, color:C.t0 }}>${total.toLocaleString()}</td>
              <td colSpan={3} />
            </tr></tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── CHECKLIST MODULE ──────────────────────────────────────────────────────────
export function ChecklistModule() {
  const { data: projects = [] } = useProjects();
  const [selProj, setSelProj] = useState('');
  const pid = selProj || (projects[0]?.id || '');
  const { data: cl = [], isLoading } = useChecklist(pid || undefined);
  const api = useApiClient();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ projectId:'', category:'Tools', item:'', assigneeName:'', notes:'' });

  const filtered = cl.filter((c:any) => c.projectId === pid);
  const cats = [...new Set(filtered.map((c:any) => c.category))];
  const done = filtered.filter((c:any) => c.checked).length;
  const total = filtered.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const ICONS: Record<string,string> = { Tools:'🔧', Materials:'📦', Docs:'📄', Access:'🔑', Safety:'🦺' };

  const toggle = async (item: any) => {
    await api.patch(`/checklist/${item.id}`, { checked: !item.checked });
    qc.invalidateQueries({ queryKey:['checklist'] });
  };

  return (
    <div>
      {showAdd && (
        <Modal title="Add Checklist Item" onClose={() => setShowAdd(false)}>
          <Field label="Project"><Sel value={form.projectId} onChange={e => setForm({ ...form, projectId:e.target.value })}><option value="">Select project…</option>{projects.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Sel></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Category"><Sel value={form.category} onChange={e => setForm({ ...form, category:e.target.value })}>{['Tools','Materials','Docs','Access','Safety'].map(x => <option key={x}>{x}</option>)}</Sel></Field>
            <Field label="Assignee"><Inp value={form.assigneeName} onChange={e => setForm({ ...form, assigneeName:e.target.value })} placeholder="Name" /></Field>
          </div>
          <Field label="Item"><Inp value={form.item} onChange={e => setForm({ ...form, item:e.target.value })} placeholder="Describe the item" /></Field>
          <Field label="Notes"><Inp value={form.notes} onChange={e => setForm({ ...form, notes:e.target.value })} /></Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={async () => { await api.post('/checklist', form); qc.invalidateQueries({ queryKey:['checklist'] }); setShowAdd(false); }}>Add</Btn>
          </div>
        </Modal>
      )}
      <SectionHdr title="Material and Tool Checklist" action={<Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add Item</Btn>} />
      <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
        {projects.map((p:any) => {
          const pi = cl.filter((c:any) => c.projectId === p.id);
          const pd = pi.filter((c:any) => c.checked).length;
          return <button key={p.id} onClick={() => setSelProj(p.id)} style={{ background:pid===p.id ? C.blueBg : C.bg3, border:`1px solid ${pid===p.id ? C.blue : C.bd}`, borderRadius:7, padding:'6px 14px', color:pid===p.id ? C.blue : C.t1, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{p.id} ({pd}/{pi.length})</button>;
        })}
      </div>
      {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div> : (
        <>
          <div style={{ background:C.bg2, border:`1px solid ${C.bd}`, borderRadius:12, padding:'18px 20px', marginBottom:18, display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ position:'relative', width:72, height:72, flexShrink:0 }}>
              <svg viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="28" fill="none" stroke={C.bg3} strokeWidth="8" />
                <circle cx="36" cy="36" r="28" fill="none" stroke={pct===100 ? C.green : pct > 60 ? C.blue : C.amber} strokeWidth="8" strokeDasharray={`${175.9*pct/100} 175.9`} strokeLinecap="round" transform="rotate(-90 36 36)" />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:C.t0, fontFamily:'JetBrains Mono,monospace' }}>{pct}%</div>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:C.t0 }}>{done} / {total} items ready</div>
              <div style={{ fontSize:12, color:C.t2, marginTop:3 }}>{projects.find((p:any) => p.id === pid)?.name || ''}</div>
            </div>
          </div>
          {!filtered.length && <Empty icon="✅" message="No checklist items" sub="Add items to track readiness for this project" />}
          {(cats as string[]).map((cat) => {
            const items = filtered.filter((c:any) => c.category === cat);
            const catDone = items.filter((c:any) => c.checked).length;
            return (
              <div key={cat} style={{ marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:16 }}>{ICONS[cat] || '📋'}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:C.t0 }}>{cat}</span>
                  <span style={{ fontSize:11, color:C.t2 }}>{catDone}/{items.length}</span>
                  <div style={{ flex:1, background:C.bg3, borderRadius:99, height:3, overflow:'hidden', marginLeft:4 }}>
                    <div style={{ width:`${(catDone/items.length)*100}%`, background:catDone===items.length ? C.green : C.blue, height:'100%' }} />
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {items.map((item:any) => (
                    <div key={item.id} style={{ background:item.checked ? C.greenBg : C.bg2, border:`1px solid ${item.checked ? C.green+'44' : C.bd}`, borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'center', gap:12, transition:'all 0.2s' }}>
                      <div onClick={() => toggle(item)} style={{ width:20, height:20, borderRadius:5, border:`2px solid ${item.checked ? C.green : C.bd}`, background:item.checked ? C.green : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                        {item.checked && <span style={{ fontSize:11, color:'#000', fontWeight:800 }}>✓</span>}
                      </div>
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:12, color:item.checked ? C.t2 : C.t0, textDecoration:item.checked ? 'line-through' : 'none' }}>{item.item}</span>
                        {item.notes && <div style={{ fontSize:11, color:C.amber, marginTop:2 }}>{item.notes}</div>}
                      </div>
                      {item.assigneeName && <span style={{ fontSize:11, color:C.t2 }}>{item.assigneeName}</span>}
                      <button onClick={async () => { await api.delete(`/checklist/${item.id}`); qc.invalidateQueries({ queryKey:['checklist'] }); }} style={{ background:'none', border:'none', color:C.t3, cursor:'pointer', fontSize:14 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
