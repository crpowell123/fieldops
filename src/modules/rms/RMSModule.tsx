import { useState, useEffect } from 'react';
import { C, SectionHdr, TabBar, Card, Btn, Modal, Field, Inp, Sel, Avatar, Spinner, Empty } from '../../components/ui';
import { useEngineers, useProjects, useResourceSpans, useResourceAllocations } from '../../hooks/useData';
import { useApiClient } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

const PC = ['#3b82f6','#f59e0b','#10b981','#ef4444','#a78bfa','#14b8a6'];
const pjColor = (id: string, projects: any[]) => PC[projects.findIndex(p => p.id === id) % PC.length] || '#64748b';

function addDays(ds: string, n: number): string {
  const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}
function wkStart(ds: string): string {
  const d = new Date(ds + 'T00:00:00'), day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function fmtD(ds: string): string {
  return new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
function RMSCalendar() {
  const { data: engineers = [], isLoading: engLoading } = useEngineers();
  const { data: projects = [] } = useProjects();
  const { data: spans = [], isLoading: spansLoading } = useResourceSpans();
  const api = useApiClient();
  const qc = useQueryClient();

  const WW = 96, RH = 52, LW = 178, WKS = 12;
  const today = new Date().toISOString().slice(0, 10);
  const [anchor, setAnchor] = useState(() => wkStart(today));
  const [drag, setDrag] = useState<{ id: string; mode: string; startX: number; origStart: string; origEnd: string } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [selP, setSelP] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ engineerId:'', projectId:'', startDate:'', endDate:'', hoursPerDay:6, role:'' });
  const [localSpans, setLocalSpans] = useState<any[]>([]);

  useEffect(() => { setLocalSpans(spans); }, [spans]);

  const weeks = Array.from({ length: WKS }, (_, i) => addDays(anchor, i * 7));
  const toX = (d: string) => (daysBetween(anchor, d) / 7) * WW;
  const canW = WW * WKS;
  const todayX = toX(today);

  const wkCap = (eId: string, wk: string) => {
    const we = addDays(wk, 4);
    return localSpans.filter(s => s.engineerId === eId).reduce((sum: number, s: any) => {
      const os = s.startDate > wk ? s.startDate : wk;
      const oe = s.endDate < we ? s.endDate : we;
      return sum + Math.max(0, daysBetween(os, oe) + 1) * s.hoursPerDay;
    }, 0);
  };

  const onDown = (e: React.MouseEvent, id: string, mode: string) => {
    e.preventDefault(); e.stopPropagation();
    const sp = localSpans.find(s => s.id === id);
    if (!sp) return;
    setDrag({ id, mode, startX: e.clientX, origStart: sp.startDate, origEnd: sp.endDate });
  };

  useEffect(() => {
    if (!drag) return;
    const mv = (e: MouseEvent) => {
      const dd = Math.round(((e.clientX - drag.startX) / WW) * 7);
      setLocalSpans(prev => prev.map(s => {
        if (s.id !== drag.id) return s;
        if (drag.mode === 'move') return { ...s, startDate: addDays(drag.origStart, dd), endDate: addDays(drag.origEnd, dd) };
        if (drag.mode === 'resizeR') { const ne = addDays(drag.origEnd, dd); return daysBetween(s.startDate, ne) < 1 ? s : { ...s, endDate: ne }; }
        if (drag.mode === 'resizeL') { const ns = addDays(drag.origStart, dd); return daysBetween(ns, s.endDate) < 1 ? s : { ...s, startDate: ns }; }
        return s;
      }));
    };
    const up = async () => {
      // Persist the moved span
      const moved = localSpans.find(s => s.id === drag.id);
      if (moved) {
        await api.patch(`/resources/spans/${drag.id}`, { startDate: moved.startDate, endDate: moved.endDate });
        qc.invalidateQueries({ queryKey: ['resource-spans'] });
      }
      setDrag(null);
    };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, [drag, localSpans]);

  const vis = selP === 'All' ? localSpans : localSpans.filter(s => s.projectId === selP);

  const addSpan = async () => {
    await api.post('/resources/spans', { ...form, hoursPerDay: Number(form.hoursPerDay) });
    qc.invalidateQueries({ queryKey: ['resource-spans'] });
    setShowAdd(false);
    setForm({ engineerId:'', projectId:'', startDate:'', endDate:'', hoursPerDay:6, role:'' });
  };

  const deleteSpan = async (id: string) => {
    await api.delete(`/resources/spans/${id}`);
    setLocalSpans(prev => prev.filter(s => s.id !== id));
    qc.invalidateQueries({ queryKey: ['resource-spans'] });
  };

  if (engLoading || spansLoading) return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>;
  if (!engineers.length) return <Empty icon="👥" message="No engineers yet" sub="Add engineers in Settings to get started" />;

  return (
    <div>
      {showAdd && (
        <Modal title="Schedule Resource Span" onClose={() => setShowAdd(false)}>
          <Field label="Engineer">
            <Sel value={form.engineerId} onChange={e => setForm({ ...form, engineerId: e.target.value })}>
              <option value="">Select engineer…</option>
              {engineers.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Sel>
          </Field>
          <Field label="Project">
            <Sel value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Select project…</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}
            </Sel>
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Start Date"><Inp type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="End Date">  <Inp type="date" value={form.endDate}   onChange={e => setForm({ ...form, endDate:   e.target.value })} /></Field>
          </div>
          <Field label={`Hours/Day: ${form.hoursPerDay}h`}>
            <input type="range" min={1} max={8} value={form.hoursPerDay} onChange={e => setForm({ ...form, hoursPerDay: Number(e.target.value) })} style={{ width:'100%', accentColor:C.blue }} />
          </Field>
          <Field label="Role"><Inp value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Lead Engineer" /></Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={addSpan} disabled={!form.engineerId || !form.projectId || !form.startDate || !form.endDate}>Schedule</Btn>
          </div>
        </Modal>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <Btn small onClick={() => setAnchor(d => addDays(d, -7))}>‹ Prev</Btn>
        <Btn small onClick={() => setAnchor(wkStart(today))}>Today</Btn>
        <Btn small onClick={() => setAnchor(d => addDays(d, 7))}>Next ›</Btn>
        <span style={{ fontSize:12, color:C.t1, fontWeight:600, lineHeight:'26px' }}>
          {fmtD(anchor)} – {fmtD(addDays(anchor, WKS * 7 - 1))}
        </span>
        <div style={{ display:'flex', gap:6, marginLeft:'auto', flexWrap:'wrap' }}>
          {['All', ...projects.map((p: any) => p.id)].map(id => (
            <button key={id} onClick={() => setSelP(id)} style={{ background: selP===id ? pjColor(id, projects)+'33' : C.bg3, border:`1px solid ${selP===id ? pjColor(id, projects) : C.bd}`, borderRadius:6, padding:'4px 10px', color: selP===id ? pjColor(id, projects) : C.t1, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{id}</button>
          ))}
        </div>
        <Btn variant="primary" onClick={() => setShowAdd(true)}>+ Schedule</Btn>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, marginBottom:12, flexWrap:'wrap' }}>
        {projects.map((p: any, i: number) => (
          <div key={p.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.t1 }}>
            <span style={{ width:10, height:10, borderRadius:3, background:PC[i % PC.length], display:'inline-block' }} />
            <span style={{ fontWeight:600, color:C.t0 }}>{p.id}</span>
            <span style={{ color:C.t2 }}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <Card style={{ overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth:LW + canW + 52, userSelect:'none' }}>
            {/* Header */}
            <div style={{ display:'flex', borderBottom:`1px solid ${C.bd}`, background:C.bg1 }}>
              <div style={{ width:LW, flexShrink:0, padding:'10px 16px', fontSize:10, fontWeight:700, color:C.t2, letterSpacing:'0.1em' }}>ENGINEER</div>
              <div style={{ width:canW, display:'flex' }}>
                {weeks.map((wk, i) => (
                  <div key={i} style={{ width:WW, flexShrink:0, padding:'10px 8px', fontSize:10, fontWeight:600, color:wk===wkStart(today) ? C.blue : C.t2, borderLeft:`1px solid ${C.bd}`, whiteSpace:'nowrap' }}>
                    {fmtD(wk)}
                  </div>
                ))}
              </div>
              <div style={{ width:52, flexShrink:0, padding:'10px 6px', fontSize:9, fontWeight:700, color:C.t3, borderLeft:`1px solid ${C.bd}` }}>AVG</div>
            </div>

            {/* Rows */}
            {engineers.map((eng: any) => {
              const rowSpans = vis.filter((s: any) => s.engineerId === eng.id);
              const avg = weeks.slice(0, 4).reduce((s: number, wk: string) => s + wkCap(eng.id, wk), 0) / 4;
              return (
                <div key={eng.id} style={{ display:'flex', borderBottom:`1px solid ${C.bd}` }}>
                  <div style={{ width:LW, flexShrink:0, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, background:C.bg2 }}>
                    <Avatar name={eng.name} color={eng.color} size={26} />
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.t0, lineHeight:1.2 }}>{eng.name}</div>
                      <div style={{ fontSize:10, color:C.t2 }}>{eng.role}</div>
                    </div>
                  </div>
                  <div style={{ width:canW, height:RH, position:'relative', flexShrink:0 }}>
                    {weeks.map((wk, wi) => {
                      const cap = wkCap(eng.id, wk);
                      return (
                        <div key={wi} style={{ position:'absolute', left:wi*WW, top:0, width:WW, height:'100%', borderLeft:`1px solid ${C.bd}`, background: cap > 40 ? C.redBg : wk === wkStart(today) ? C.blueBg+'88' : 'transparent' }}>
                          {cap > 0 && <div style={{ position:'absolute', bottom:0, left:2, right:2, height:3, background: cap > 40 ? C.red : cap > 28 ? C.amber : C.blue, borderRadius:2, opacity:0.6 }} />}
                        </div>
                      );
                    })}
                    {todayX >= 0 && todayX <= canW && (
                      <div style={{ position:'absolute', left:todayX, top:0, width:2, height:'100%', background:C.blue, opacity:0.7, zIndex:3, pointerEvents:'none' }} />
                    )}
                    {rowSpans.map((sp: any) => {
                      const x1 = toX(sp.startDate), x2 = toX(sp.endDate) + (WW / 7), w = Math.max(x2 - x1, 18);
                      const color = pjColor(sp.projectId, projects);
                      const isH = hover === sp.id, isDr = drag?.id === sp.id;
                      return (
                        <div key={sp.id}
                          onMouseEnter={() => setHover(sp.id)}
                          onMouseLeave={() => setHover(null)}
                          onMouseDown={e => onDown(e, sp.id, 'move')}
                          title={`${sp.role} · ${sp.hoursPerDay}h/day\n${sp.startDate} → ${sp.endDate}`}
                          style={{ position:'absolute', left:x1, top:8, width:w, height:RH-16, background:color+(isH||isDr?'55':'33'), border:`1.5px solid ${color}`, borderRadius:6, cursor:isDr?'grabbing':'grab', display:'flex', alignItems:'center', overflow:'hidden', zIndex:isDr?10:isH?5:2, boxShadow:isDr?`0 4px 20px ${color}55`:'none' }}>
                          <div onMouseDown={e => onDown(e, sp.id, 'resizeL')} style={{ position:'absolute', left:0, top:0, width:8, height:'100%', cursor:'ew-resize', zIndex:4, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:2, height:14, background:color, borderRadius:1, opacity:isH?0.9:0.4 }} />
                          </div>
                          <div style={{ paddingLeft:10, overflow:'hidden', pointerEvents:'none', flex:1 }}>
                            <div style={{ fontSize:10, fontWeight:700, color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sp.projectId}</div>
                            <div style={{ fontSize:9, color:color+'cc' }}>{sp.hoursPerDay}h/d</div>
                          </div>
                          <div onMouseDown={e => onDown(e, sp.id, 'resizeR')} style={{ position:'absolute', right:0, top:0, width:8, height:'100%', cursor:'ew-resize', zIndex:4, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:2, height:14, background:color, borderRadius:1, opacity:isH?0.9:0.4 }} />
                          </div>
                          {isH && (
                            <div onMouseDown={e => { e.stopPropagation(); deleteSpan(sp.id); }} style={{ position:'absolute', top:2, right:8, width:14, height:14, borderRadius:'50%', background:C.redBg, border:`1px solid ${C.red}`, color:C.red, fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:6 }}>×</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ width:52, flexShrink:0, borderLeft:`1px solid ${C.bd}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1, background:C.bg1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color: avg > 40 ? C.red : avg > 28 ? C.amber : C.green, fontFamily:'JetBrains Mono,monospace', lineHeight:1 }}>{Math.round(avg)}</div>
                    <div style={{ fontSize:8, color:C.t3 }}>h/wk</div>
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            <div style={{ display:'flex', background:C.bg1, borderTop:`1px solid ${C.bd}` }}>
              <div style={{ width:LW, flexShrink:0, padding:'8px 16px', fontSize:10, fontWeight:700, color:C.t2 }}>TEAM LOAD</div>
              <div style={{ width:canW, display:'flex' }}>
                {weeks.map((wk, wi) => {
                  const tot = engineers.reduce((s: number, eng: any) => s + wkCap(eng.id, wk), 0);
                  const pct = Math.min((tot / (engineers.length * 40)) * 100, 100);
                  const col = pct > 90 ? C.red : pct > 70 ? C.amber : C.green;
                  return (
                    <div key={wi} style={{ width:WW, borderLeft:`1px solid ${C.bd}`, padding:'6px 8px' }}>
                      <div style={{ background:C.bg3, borderRadius:2, height:4, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, background:col, height:'100%' }} />
                      </div>
                      <div style={{ fontSize:9, color:col, fontFamily:'JetBrains Mono,monospace', fontWeight:600, marginTop:4 }}>{tot}h</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ width:52, flexShrink:0 }} />
            </div>
          </div>
        </div>
      </Card>
      <div style={{ display:'flex', gap:20, marginTop:10, fontSize:11, color:C.t2 }}>
        <span>Drag span to move</span>
        <span>Drag edges to resize</span>
        <span>Hover then × to delete</span>
      </div>
    </div>
  );
}

// ── RMS MODULE ────────────────────────────────────────────────────────────────
export function RMSModule() {
  const [tab, setTab] = useState('calendar');
  return (
    <div>
      <SectionHdr title="Resource Management System" />
      <TabBar tabs={[['calendar','Calendar'],['heatmap','Heatmap'],['matrix','Matrix']]} active={tab} onSet={setTab} />
      {tab === 'calendar' && <RMSCalendar />}
      {tab === 'heatmap'  && <HeatmapTab />}
      {tab === 'matrix'   && <MatrixTab />}
    </div>
  );
}

function HeatmapTab() {
  const { data: engineers = [] } = useEngineers();
  const { data: projects = [] } = useProjects();
  const { data: allocs = [] } = useResourceAllocations();
  const CAP = 40;
  const util = (id: string) => allocs.filter((a: any) => a.engineerId === id).reduce((s: number, a: any) => s + a.hoursPerWeek, 0);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      {engineers.map((eng: any) => {
        const hrs = util(eng.id), over = hrs > CAP;
        const ea = allocs.filter((a: any) => a.engineerId === eng.id);
        return (
          <Card key={eng.id} style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <Avatar name={eng.name} color={eng.color} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.t0 }}>{eng.name}</div>
                <div style={{ fontSize:10, color:C.t2 }}>{eng.role}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:15, fontWeight:700, color:over ? C.red : C.t0, fontFamily:'JetBrains Mono,monospace' }}>{hrs}h</div>
                <div style={{ fontSize:10, color:C.t2 }}>/{CAP}h</div>
              </div>
            </div>
            <div style={{ background:C.bg3, borderRadius:4, height:8, overflow:'hidden', marginBottom:10, display:'flex' }}>
              {ea.map((a: any) => { const ci = projects.findIndex((p: any) => p.id === a.projectId); return <div key={a.id} style={{ width:`${Math.min((a.hoursPerWeek / CAP) * 100, 100)}%`, background:PC[ci % PC.length], height:'100%' }} />; })}
            </div>
            {ea.map((a: any) => {
              const proj = projects.find((p: any) => p.id === a.projectId);
              return (
                <div key={a.id} style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.t1, marginBottom:4 }}>
                  <span style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{proj?.name || a.projectId}</span>
                  <span style={{ fontFamily:'JetBrains Mono,monospace', color:C.t0 }}>{a.hoursPerWeek}h</span>
                </div>
              );
            })}
            {over && <div style={{ fontSize:10, color:C.red, fontWeight:700, marginTop:4 }}>OVER CAPACITY by {hrs - CAP}h</div>}
          </Card>
        );
      })}
    </div>
  );
}

function MatrixTab() {
  const { data: engineers = [] } = useEngineers();
  const { data: projects = [] } = useProjects();
  const { data: allocs = [] } = useResourceAllocations();
  const CAP = 40;
  const util = (id: string) => allocs.filter((a: any) => a.engineerId === id).reduce((s: number, a: any) => s + a.hoursPerWeek, 0);

  return (
    <Card style={{ overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.bd}` }}>
              <th style={{ padding:'10px 16px', textAlign:'left', color:C.t2, fontWeight:600 }}>Engineer</th>
              {projects.map((p: any) => <th key={p.id} style={{ padding:'10px 12px', color:C.t2, fontWeight:600, fontSize:11 }}><div style={{ maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div></th>)}
              <th style={{ padding:'10px 12px', color:C.t2, fontWeight:600 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {engineers.map((eng: any) => {
              const tot = util(eng.id);
              return (
                <tr key={eng.id} style={{ borderBottom:`1px solid ${C.bd}` }}>
                  <td style={{ padding:'10px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}><Avatar name={eng.name} color={eng.color} size={22} /><span style={{ color:C.t0, fontWeight:500 }}>{eng.name}</span></div>
                  </td>
                  {projects.map((p: any) => {
                    const a = allocs.find((x: any) => x.engineerId === eng.id && x.projectId === p.id);
                    return <td key={p.id} style={{ padding:'10px 12px', textAlign:'center' }}>{a ? <span style={{ fontFamily:'JetBrains Mono,monospace', color:C.blue, fontWeight:600 }}>{a.hoursPerWeek}h</span> : <span style={{ color:C.t3 }}>—</span>}</td>;
                  })}
                  <td style={{ padding:'10px 12px', textAlign:'center' }}>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:700, color: tot > CAP ? C.red : tot > 30 ? C.amber : C.green }}>{tot}h</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
