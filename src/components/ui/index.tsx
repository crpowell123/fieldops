import React from 'react';
import { clsx } from 'clsx';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
export const C = {
  bg0:'#07090f', bg1:'#0c1018', bg2:'#111827', bg3:'#1a2235',
  bd:'#1f2d42', t0:'#f0f4ff', t1:'#94a3b8', t2:'#4a5568', t3:'#2d3a4d',
  blue:'#3b82f6', blueBg:'#0f1e38',
  green:'#22c55e', greenBg:'#0a1f14',
  amber:'#f59e0b', amberBg:'#1f1509',
  red:'#ef4444', redBg:'#1f0a0a',
  purple:'#a78bfa', purpleBg:'#130e24',
  teal:'#14b8a6', tealBg:'#071917',
};

export const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  'Done':        { bg:C.greenBg,  fg:C.green,  dot:C.green  },
  'Delivered':   { bg:C.greenBg,  fg:C.green,  dot:C.green  },
  'Provisioned': { bg:C.greenBg,  fg:C.green,  dot:C.green  },
  'Completed':   { bg:C.greenBg,  fg:C.green,  dot:C.green  },
  'In Progress': { bg:C.blueBg,   fg:C.blue,   dot:C.blue   },
  'In Transit':  { bg:C.blueBg,   fg:C.blue,   dot:C.blue   },
  'On Order':    { bg:C.blueBg,   fg:C.blue,   dot:C.blue   },
  'Planning':    { bg:C.blueBg,   fg:C.blue,   dot:C.blue   },
  'Syncing':     { bg:C.blueBg,   fg:C.blue,   dot:C.blue   },
  'Upcoming':    { bg:C.purpleBg, fg:C.purple, dot:C.purple },
  'Watching':    { bg:C.amberBg,  fg:C.amber,  dot:C.amber  },
  'On Hold':     { bg:C.amberBg,  fg:C.amber,  dot:C.amber  },
  'Pending PO':  { bg:C.amberBg,  fg:C.amber,  dot:C.amber  },
  'Open':        { bg:C.redBg,    fg:C.red,    dot:C.red    },
  'Error':       { bg:C.redBg,    fg:C.red,    dot:C.red    },
  'Accepted':    { bg:C.purpleBg, fg:C.purple, dot:C.purple },
  'Positive':    { bg:C.greenBg,  fg:C.green,  dot:C.green  },
  'Negative':    { bg:C.redBg,    fg:C.red,    dot:C.red    },
  'Regulatory':  { bg:C.purpleBg, fg:C.purple, dot:C.purple },
};

// ── CHIP ──────────────────────────────────────────────────────────────────────
export function Chip({ label, size = 11 }: { label: string; size?: number }) {
  const s = STATUS_COLORS[label] || { bg:C.bg3, fg:C.t1, dot:C.t2 };
  return (
    <span style={{ background:s.bg, color:s.fg, border:`1px solid ${s.dot}22`, borderRadius:6, padding:'2px 9px', fontSize:size, fontWeight:700, display:'inline-flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.dot, flexShrink:0 }} />
      {label}
    </span>
  );
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
export function Avatar({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:color+'33', border:`1.5px solid ${color}`, color, fontSize:size*0.35, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'ghost' | 'danger';
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  small?: boolean;
  loading?: boolean;
}
export function Btn({ children, variant = 'ghost', small, loading, disabled, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    borderRadius:7, fontWeight:600, cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6,
    padding: small ? '4px 10px' : '7px 14px',
    fontSize: small ? 11 : 13,
    opacity: disabled || loading ? 0.6 : 1,
    border:'none',
  };
  const variants: Record<BtnVariant, React.CSSProperties> = {
    primary: { background:C.blue, color:'#fff' },
    ghost:   { background:C.bg3, border:`1px solid ${C.bd}`, color:C.t1 },
    danger:  { background:C.redBg, border:`1px solid ${C.red}40`, color:C.red },
  };
  return (
    <button style={{ ...base, ...variants[variant] }} disabled={disabled || loading} {...rest}>
      {loading && <span style={{ width:12, height:12, border:`2px solid currentColor`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
      {children}
    </button>
  );
}

// ── INPUT ─────────────────────────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  background:C.bg1, border:`1px solid ${C.bd}`, borderRadius:7,
  padding:'7px 12px', color:C.t0, fontSize:12, outline:'none',
  fontFamily:'inherit', width:'100%',
};

export function Inp(props: React.InputHTMLAttributes<HTMLInputElement> & { style?: React.CSSProperties }) {
  const { style, ...rest } = props;
  return <input style={{ ...inputStyle, ...style }} {...rest} />;
}

export function Sel({ children, style, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { style?: React.CSSProperties }) {
  return (
    <select style={{ ...inputStyle, color:C.t1, ...style }} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ style, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { style?: React.CSSProperties }) {
  return <textarea style={{ ...inputStyle, minHeight:70, resize:'vertical', ...style }} {...rest} />;
}

// ── FIELD ─────────────────────────────────────────────────────────────────────
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:700, color:C.t2, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:5 }}>{label}</div>
      {children}
    </div>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(6px)' }}>
      <div style={{ background:C.bg1, border:`1px solid ${C.bd}`, borderRadius:14, padding:28, width:520, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 32px 64px rgba(0,0,0,0.6)', animation:'fadeIn 0.15s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontSize:15, fontWeight:700, color:C.t0 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.t2, fontSize:20, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── CARD ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div style={{ background:C.bg2, border:`1px solid ${C.bd}`, borderRadius:12, ...style }} className={className}>
      {children}
    </div>
  );
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────
export function SectionHdr({ title, count, action }: { title: string; count?: string | number; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:15, fontWeight:700, color:C.t0, letterSpacing:'-0.02em' }}>{title}</span>
        {count != null && <span style={{ background:C.bg3, color:C.t2, fontSize:11, fontWeight:600, padding:'1px 8px', borderRadius:99 }}>{count}</span>}
      </div>
      {action}
    </div>
  );
}

// ── TAB BAR ───────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onSet }: { tabs: [string, string][]; active: string; onSet: (id: string) => void }) {
  return (
    <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:`1px solid ${C.bd}` }}>
      {tabs.map(([id, label]) => (
        <button key={id} onClick={() => onSet(id)} style={{ background:'none', border:'none', borderBottom:`2px solid ${active===id ? C.blue : 'transparent'}`, color:active===id ? C.blue : C.t1, fontSize:13, fontWeight:active===id ? 700 : 500, padding:'6px 14px 10px', cursor:'pointer', marginBottom:-1, fontFamily:'inherit' }}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── BUDGET BAR ────────────────────────────────────────────────────────────────
export function BudgetBar({ spent, total }: { spent: number; total: number }) {
  const p = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const col = p > 90 ? C.red : p > 70 ? C.amber : C.green;
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.t2, marginBottom:4 }}>
        <span>${spent.toLocaleString()} spent</span>
        <span style={{ color: p > 80 ? C.amber : C.t2 }}>{p.toFixed(0)}%</span>
      </div>
      <div style={{ background:C.bg3, borderRadius:4, height:5, overflow:'hidden' }}>
        <div style={{ width:`${p}%`, background:col, height:'100%', transition:'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function Empty({ icon, message, sub }: { icon: string; message: string; sub?: string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', color:C.t2 }}>
      <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:600, color:C.t1, marginBottom:4 }}>{message}</div>
      {sub && <div style={{ fontSize:12, color:C.t2 }}>{sub}</div>}
    </div>
  );
}

// ── SPINNER ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{ width:size, height:size, border:`2px solid ${C.bd}`, borderTopColor:C.blue, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background:C.bg2, border:`1px solid ${C.bd}`, borderRadius:10, padding:'12px 16px' }}>
      <div style={{ fontSize:20, fontWeight:700, color, fontFamily:'JetBrains Mono, monospace' }}>{value}</div>
      <div style={{ fontSize:10, color:C.t2, marginTop:2 }}>{label}</div>
    </div>
  );
}
