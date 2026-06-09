import { CreateOrganization } from '@clerk/clerk-react';
import { C } from '../../components/ui';

export function OnboardingPage() {
  return (
    <div style={{ minHeight:'100vh', background:C.bg0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ marginBottom:32, textAlign:'center' }}>
        <div style={{ width:48, height:48, background:'linear-gradient(135deg,#3b82f6,#6366f1)', borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff', fontWeight:800, margin:'0 auto 16px' }}>F</div>
        <div style={{ fontSize:24, fontWeight:800, color:C.t0, letterSpacing:'-0.03em' }}>Welcome to FieldOps</div>
        <div style={{ fontSize:14, color:C.t2, marginTop:6 }}>Create your MSP organization to get started</div>
      </div>
      <CreateOrganization
        appearance={{
          elements: {
            rootBox: { background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 14 },
            card: { background: 'transparent', boxShadow: 'none' },
          },
        }}
        afterCreateOrganizationUrl="/dashboard"
      />
    </div>
  );
}
