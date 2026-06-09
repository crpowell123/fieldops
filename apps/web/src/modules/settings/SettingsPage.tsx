import { useState } from 'react';
import { useOrganization, useUser } from '@clerk/clerk-react';
import { C, Card, Btn, Field, Inp, Chip, SectionHdr, Spinner } from '../../components/ui';
import { useCWStatus } from '../../hooks/useData';
import { useApiClient } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

export function SettingsPage() {
  const [tab, setTab] = useState('connectwise');
  const tabs = [['connectwise','ConnectWise PSA'],['team','Team'],['billing','Billing'],['account','Account']];

  return (
    <div>
      <SectionHdr title="Settings" />
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:`1px solid ${C.bd}` }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background:'none', border:'none', borderBottom:`2px solid ${tab===id ? C.blue : 'transparent'}`, color:tab===id ? C.blue : C.t1, fontSize:13, fontWeight:tab===id ? 700 : 500, padding:'6px 14px 10px', cursor:'pointer', marginBottom:-1, fontFamily:'inherit' }}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'connectwise' && <CWSettings />}
      {tab === 'team'        && <TeamSettings />}
      {tab === 'billing'     && <BillingSettings />}
      {tab === 'account'     && <AccountSettings />}
    </div>
  );
}

// ── CONNECTWISE SETTINGS ──────────────────────────────────────────────────────
function CWSettings() {
  const { data: cwStatus } = useCWStatus();
  const api = useApiClient();
  const qc = useQueryClient();
  const [form, setForm] = useState({ companyId:'', site:'na.myconnectwise.net', clientId:'', publicKey:'', privateKey:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const save = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.post<any>('/connectwise/credentials', form);
      setSuccess(`Connected to ${res.data?.companyName} (CW ${res.data?.version})`);
      qc.invalidateQueries({ queryKey: ['cw-status'] });
    } catch (e: any) {
      setError(e.message || 'Failed to connect');
    }
    setSaving(false);
  };

  const disconnect = async () => {
    await api.delete('/connectwise/credentials');
    qc.invalidateQueries({ queryKey: ['cw-status'] });
  };

  return (
    <div style={{ maxWidth:520 }}>
      <Card style={{ padding:24 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.t0, marginBottom:4 }}>ConnectWise PSA Integration</div>
        <div style={{ fontSize:12, color:C.t2, marginBottom:20 }}>
          Credentials are encrypted with AES-256 at rest. Get your API key from
          <span style={{ color:C.blue }}> System → Members → API Members</span> in ConnectWise.
        </div>

        {cwStatus && (
          <div style={{ background:C.greenBg, border:`1px solid ${C.green}44`, borderRadius:8, padding:'10px 14px', fontSize:12, color:C.green, marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>✓ Connected · Last synced {cwStatus.lastSyncedAt ? new Date(cwStatus.lastSyncedAt).toLocaleString() : 'never'}</span>
            <Btn small variant="danger" onClick={disconnect}>Disconnect</Btn>
          </div>
        )}

        <Field label="Company ID"><Inp value={form.companyId} onChange={e => setForm({ ...form, companyId:e.target.value })} placeholder="e.g. mycompany" /></Field>
        <Field label="Server Domain"><Inp value={form.site} onChange={e => setForm({ ...form, site:e.target.value })} placeholder="e.g. na.myconnectwise.net" /></Field>
        <Field label="Client ID"><Inp value={form.clientId} onChange={e => setForm({ ...form, clientId:e.target.value })} placeholder="From developer.connectwise.com" /></Field>
        <Field label="Public Key"><Inp value={form.publicKey} onChange={e => setForm({ ...form, publicKey:e.target.value })} placeholder="API Member public key" /></Field>
        <Field label="Private Key"><Inp type="password" value={form.privateKey} onChange={e => setForm({ ...form, privateKey:e.target.value })} placeholder="API Member private key" /></Field>

        {error   && <div style={{ background:C.redBg,   border:`1px solid ${C.red}44`,   borderRadius:8, padding:'8px 12px', fontSize:12, color:C.red,   marginBottom:12 }}>{error}</div>}
        {success && <div style={{ background:C.greenBg, border:`1px solid ${C.green}44`, borderRadius:8, padding:'8px 12px', fontSize:12, color:C.green, marginBottom:12 }}>{success}</div>}

        <Btn variant="primary" loading={saving} onClick={save} disabled={!form.companyId || !form.clientId || !form.publicKey || !form.privateKey}>
          {cwStatus ? 'Update Credentials' : 'Connect ConnectWise PSA'}
        </Btn>
      </Card>
    </div>
  );
}

// ── TEAM SETTINGS ─────────────────────────────────────────────────────────────
function TeamSettings() {
  const api = useApiClient();
  const [members, setMembers] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    api.get<{ data: any[] }>('/tenants/me/members').then(r => { setMembers(r.data); setLoaded(true); });
  }

  if (!loaded) return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>;

  return (
    <div style={{ maxWidth:640 }}>
      <Card style={{ overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.bd}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, fontWeight:700, color:C.t0 }}>Team Members ({members.length})</span>
          <span style={{ fontSize:11, color:C.t2 }}>Invite members via your Clerk organization dashboard</span>
        </div>
        {members.map(m => (
          <div key={m.id} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.bd}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:C.t0 }}>{m.name}</div>
              <div style={{ fontSize:11, color:C.t2 }}>{m.email}</div>
            </div>
            <Chip label={m.role} size={10} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── BILLING SETTINGS ──────────────────────────────────────────────────────────
function BillingSettings() {
  const api = useApiClient();
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    setLoading(true);
    const res = await api.post<{ data: { url: string } }>('/billing/portal');
    window.location.href = res.data.url;
  };

  const PLANS = [
    { id:'starter',    name:'Starter',    price:'$149/mo',  features:['3 engineers','10 active projects','Core modules'] },
    { id:'growth',     name:'Growth',     price:'$349/mo',  features:['10 engineers','Unlimited projects','AI + Regulatory planner','Priority support'] },
    { id:'enterprise', name:'Enterprise', price:'$799/mo',  features:['Unlimited engineers','SSO','SLA','Public API','White-label option'] },
  ];

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {PLANS.map(plan => (
          <Card key={plan.id} style={{ padding:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.t0, marginBottom:4 }}>{plan.name}</div>
            <div style={{ fontSize:22, fontWeight:800, color:C.blue, fontFamily:'JetBrains Mono,monospace', marginBottom:12 }}>{plan.price}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
              {plan.features.map(f => <div key={f} style={{ fontSize:12, color:C.t1, display:'flex', gap:6 }}><span style={{ color:C.green }}>✓</span>{f}</div>)}
            </div>
            <Btn variant="primary" small onClick={async () => {
              const res = await api.post<{ data: { url: string } }>('/billing/checkout', { plan: plan.id });
              window.location.href = (res as any).data.url;
            }}>Upgrade to {plan.name}</Btn>
          </Card>
        ))}
      </div>
      <Btn onClick={openPortal} loading={loading}>Manage Billing &amp; Invoices</Btn>
    </div>
  );
}

// ── ACCOUNT SETTINGS ──────────────────────────────────────────────────────────
function AccountSettings() {
  const { organization } = useOrganization();
  const { user } = useUser();
  return (
    <div style={{ maxWidth:480 }}>
      <Card style={{ padding:24 }}>
        <Field label="Organization Name">
          <div style={{ fontSize:13, color:C.t0, background:C.bg3, border:`1px solid ${C.bd}`, borderRadius:7, padding:'7px 12px' }}>{organization?.name}</div>
        </Field>
        <Field label="Your Name">
          <div style={{ fontSize:13, color:C.t0, background:C.bg3, border:`1px solid ${C.bd}`, borderRadius:7, padding:'7px 12px' }}>{user?.fullName}</div>
        </Field>
        <Field label="Email">
          <div style={{ fontSize:13, color:C.t0, background:C.bg3, border:`1px solid ${C.bd}`, borderRadius:7, padding:'7px 12px' }}>{user?.primaryEmailAddress?.emailAddress}</div>
        </Field>
        <div style={{ fontSize:11, color:C.t2, marginTop:8 }}>
          Manage your profile, password, and security via your account settings in the user menu (top right).
        </div>
      </Card>
    </div>
  );
}
