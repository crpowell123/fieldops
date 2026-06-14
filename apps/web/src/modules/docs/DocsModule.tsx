import { useState, useRef } from 'react';
import { C, SectionHdr, Card, Btn, Modal, Field, Inp, Sel, Spinner, Empty } from '../../components/ui';
import { useProjects } from '../../hooks/useData';

// ── TYPES ─────────────────────────────────────────────────────────────────────

type DocCategory = 'Proposal' | 'Scope of Work' | 'Permit' | 'Drawing' | 'Change Order' | 'Inspection' | 'Other';
type DocStatus   = 'Draft' | 'Pending Review' | 'Approved' | 'Superseded';

interface Doc {
  id: string;
  projectId: string;
  name: string;
  category: DocCategory;
  status: DocStatus;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  notes: string;
}

const CATEGORIES: DocCategory[] = ['Proposal','Scope of Work','Permit','Drawing','Change Order','Inspection','Other'];
const STATUSES: DocStatus[] = ['Draft','Pending Review','Approved','Superseded'];

const STATUS_COLORS: Record<DocStatus, { bg: string; fg: string }> = {
  'Draft':          { bg: C.bg3,     fg: C.t1   },
  'Pending Review': { bg: C.amberBg, fg: C.amber },
  'Approved':       { bg: C.greenBg, fg: C.green },
  'Superseded':     { bg: C.bg2,     fg: C.t3   },
};

const CAT_ICONS: Record<DocCategory, string> = {
  'Proposal':      '📋',
  'Scope of Work': '📝',
  'Permit':        '🏛️',
  'Drawing':       '📐',
  'Change Order':  '🔄',
  'Inspection':    '🔍',
  'Other':         '📄',
};

// Seed docs that look realistic
const SEED_DOCS: Doc[] = [
  { id:'d1', projectId:'PRJ-001', name:'Apex Medical – Structured Cabling SOW v2.pdf', category:'Scope of Work', status:'Approved', size:'1.2 MB', uploadedBy:'J. Chen', uploadedAt:'2025-05-14', notes:'Final approved scope. Replaces v1.' },
  { id:'d2', projectId:'PRJ-001', name:'Apex Medical – Floor Plan Riser Diagram.dwg', category:'Drawing', status:'Approved', size:'3.8 MB', uploadedBy:'M. Ramos', uploadedAt:'2025-05-20', notes:'IDF/MDF locations confirmed with facilities.' },
  { id:'d3', projectId:'PRJ-001', name:'City Fiber Permit Application.pdf', category:'Permit', status:'Pending Review', size:'450 KB', uploadedBy:'A. Kim', uploadedAt:'2025-06-03', notes:'Submitted to city planning. ETA 2–3 weeks.' },
  { id:'d4', projectId:'PRJ-001', name:'Change Order #1 – Add CCTV Coverage.pdf', category:'Change Order', status:'Approved', size:'210 KB', uploadedBy:'J. Chen', uploadedAt:'2025-06-08', notes:'$14,200 addition. Client signed off.' },
  { id:'d5', projectId:'PRJ-002', name:'Harborview HQ – Initial Proposal.pdf', category:'Proposal', status:'Superseded', size:'890 KB', uploadedBy:'T. Liu', uploadedAt:'2025-04-10', notes:'Superseded by v2.' },
  { id:'d6', projectId:'PRJ-002', name:'Harborview HQ – Proposal v2 FINAL.pdf', category:'Proposal', status:'Approved', size:'1.1 MB', uploadedBy:'T. Liu', uploadedAt:'2025-04-24', notes:'Signed by client 2025-04-25.' },
  { id:'d7', projectId:'PRJ-002', name:'Structured Cabling As-Built Drawing.pdf', category:'Drawing', status:'Draft', size:'4.2 MB', uploadedBy:'M. Ramos', uploadedAt:'2025-06-11', notes:'In progress – not yet ready for client delivery.' },
  { id:'d8', projectId:'PRJ-003', name:'Eastside Schools – Site Survey Report.pdf', category:'Inspection', status:'Approved', size:'2.1 MB', uploadedBy:'A. Kim', uploadedAt:'2025-05-28', notes:'Covers all 3 buildings.' },
  { id:'d9', projectId:'PRJ-004', name:'Metro Transit – Trenching Permit.pdf', category:'Permit', status:'Draft', size:'330 KB', uploadedBy:'J. Chen', uploadedAt:'2025-06-05', notes:'Environmental study required before submission.' },
];

// ── DOCS MODULE ───────────────────────────────────────────────────────────────

export function DocsModule() {
  const { data: projects = [], isLoading } = useProjects();
  const [docs, setDocs]           = useState<Doc[]>(SEED_DOCS);
  const [selProj, setSelProj]     = useState('');
  const [selCat, setSelCat]       = useState('');
  const [selStatus, setSelStatus] = useState('');
  const [search, setSearch]       = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [preview, setPreview]     = useState<Doc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    projectId: '', name: '', category: 'Other' as DocCategory,
    status: 'Draft' as DocStatus, notes: '', uploadedBy: '',
  });

  const filtered = docs.filter(d => {
    if (selProj   && d.projectId !== selProj)               return false;
    if (selCat    && d.category  !== selCat)                 return false;
    if (selStatus && d.status    !== selStatus)              return false;
    if (search    && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by project
  const byProject: Record<string, Doc[]> = {};
  filtered.forEach(d => {
    if (!byProject[d.projectId]) byProject[d.projectId] = [];
    byProject[d.projectId].push(d);
  });

  const projName = (id: string) => projects.find((p: any) => p.id === id)?.name ?? id;

  const submitDoc = () => {
    if (!form.name.trim() || !form.projectId) return;
    const now = new Date().toISOString().slice(0, 10);
    setDocs(prev => [{
      id: `d${Date.now()}`,
      ...form,
      size: '—',
      uploadedAt: now,
    }, ...prev]);
    setShowAdd(false);
    setForm({ projectId:'', name:'', category:'Other', status:'Draft', notes:'', uploadedBy:'' });
  };

  const deleteDoc = (id: string) => setDocs(prev => prev.filter(d => d.id !== id));

  const updateStatus = (id: string, status: DocStatus) =>
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>;

  return (
    <div>
      <SectionHdr title="Project documents" />

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total docs',      value: docs.length,                                        color: C.t0   },
          { label:'Pending review',  value: docs.filter(d=>d.status==='Pending Review').length, color: C.amber },
          { label:'Approved',        value: docs.filter(d=>d.status==='Approved').length,       color: C.green },
          { label:'Permits on file', value: docs.filter(d=>d.category==='Permit').length,       color: C.purple },
        ].map(m => (
          <div key={m.label} style={{ background:C.bg2, borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:C.t2, marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:500, color:m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <Inp
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents…"
          style={{ fontSize:12, width:200 }}
        />
        <Sel value={selProj} onChange={e => setSelProj(e.target.value)} style={{ fontSize:12 }}>
          <option value="">All projects</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Sel>
        <Sel value={selCat} onChange={e => setSelCat(e.target.value)} style={{ fontSize:12 }}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </Sel>
        <Sel value={selStatus} onChange={e => setSelStatus(e.target.value)} style={{ fontSize:12 }}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </Sel>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <input ref={fileRef} type="file" style={{ display:'none' }} onChange={() => setShowAdd(true)} />
          <Btn onClick={() => fileRef.current?.click()}>Upload file</Btn>
          <Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add document</Btn>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add document" onClose={() => setShowAdd(false)}>
          <Field label="Project">
            <Sel value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Select project…</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Sel>
          </Field>
          <Field label="Document name">
            <Inp value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Site Survey Report.pdf" />
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Category">
              <Sel value={form.category} onChange={e => setForm({ ...form, category: e.target.value as DocCategory })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </Sel>
            </Field>
            <Field label="Status">
              <Sel value={form.status} onChange={e => setForm({ ...form, status: e.target.value as DocStatus })}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </Sel>
            </Field>
          </div>
          <Field label="Uploaded by">
            <Inp value={form.uploadedBy} onChange={e => setForm({ ...form, uploadedBy: e.target.value })}
              placeholder="Your name" />
          </Field>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Version notes, approval status, etc."
              style={{ width:'100%', minHeight:64, padding:'8px 10px', background:C.bg3, border:`1px solid ${C.bd}`, borderRadius:8, color:C.t0, fontSize:12, fontFamily:'inherit', resize:'vertical' }}
            />
          </Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={submitDoc}>Save document</Btn>
          </div>
        </Modal>
      )}

      {/* Preview modal */}
      {preview && (
        <Modal title={preview.name} onClose={() => setPreview(null)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              ['Project',     projName(preview.projectId)],
              ['Category',    `${CAT_ICONS[preview.category]} ${preview.category}`],
              ['Size',        preview.size],
              ['Uploaded by', preview.uploadedBy || '—'],
              ['Uploaded',    preview.uploadedAt],
              ['Status',      preview.status],
            ].map(([k, v]) => (
              <div key={k} style={{ background:C.bg2, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:10, color:C.t2, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:13, color:C.t0, fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>
          {preview.notes && (
            <div style={{ background:C.bg3, borderRadius:8, padding:'10px 14px', marginBottom:14 }}>
              <div style={{ fontSize:10, color:C.t2, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Notes</div>
              <div style={{ fontSize:13, color:C.t1, lineHeight:1.6 }}>{preview.notes}</div>
            </div>
          )}
          <Field label="Update status">
            <Sel value={preview.status} onChange={e => { updateStatus(preview.id, e.target.value as DocStatus); setPreview({ ...preview, status: e.target.value as DocStatus }); }}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Sel>
          </Field>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
            <Btn onClick={() => { deleteDoc(preview.id); setPreview(null); }}
              style={{ color:C.red, borderColor:`${C.red}55` }}>Delete</Btn>
            <Btn variant="primary" onClick={() => setPreview(null)}>Close</Btn>
          </div>
        </Modal>
      )}

      {/* Document list */}
      {!filtered.length
        ? <Empty icon="📄" message="No documents found" sub="Upload a file or add a document record" />
        : Object.entries(byProject).map(([pid, pdocs]) => (
          <div key={pid} style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.t2, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>
              {projName(pid)}
              <span style={{ marginLeft:8, color:C.t3, fontWeight:400 }}>{pdocs.length} doc{pdocs.length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {pdocs.map(doc => {
                const sc = STATUS_COLORS[doc.status];
                return (
                  <div key={doc.id} onClick={() => setPreview(doc)}
                    style={{ background:C.bg1, border:`1px solid ${C.bd}`, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer', transition:'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue + '55')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = C.bd)}
                  >
                    <div style={{ fontSize:22, flexShrink:0 }}>{CAT_ICONS[doc.category]}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:C.t0, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {doc.name}
                      </div>
                      <div style={{ fontSize:11, color:C.t2 }}>
                        {doc.category} · {doc.size} · {doc.uploadedBy || 'Unknown'} · {doc.uploadedAt}
                      </div>
                    </div>
                    <span style={{ background:sc.bg, color:sc.fg, fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:99, flexShrink:0, border:`1px solid ${sc.fg}33` }}>
                      {doc.status}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteDoc(doc.id); }}
                      style={{ background:'none', border:'none', color:C.t3, cursor:'pointer', fontSize:16, padding:'0 4px', flexShrink:0 }}
                    >×</button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      }
    </div>
  );
}
