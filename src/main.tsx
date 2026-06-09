import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <div style={{ minHeight:'100vh', background:'#07090f', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, fontFamily:'sans-serif' }}>
      <div style={{ fontSize:32 }}>⚡</div>
      <div style={{ fontSize:20, fontWeight:700, color:'#f0f4ff' }}>FieldOps</div>
      <div style={{ background:'#1f0a0a', border:'1px solid #ef444440', borderRadius:10, padding:'16px 24px', maxWidth:480, textAlign:'center' }}>
        <div style={{ color:'#ef4444', fontWeight:700, marginBottom:8 }}>Missing VITE_CLERK_PUBLISHABLE_KEY</div>
        <div style={{ color:'#94a3b8', fontSize:13, lineHeight:1.6 }}>
          Create <code style={{ background:'#1a2235', padding:'2px 6px', borderRadius:4 }}>apps/web/.env.local</code> with:<br/><br/>
          <code style={{ background:'#1a2235', padding:'8px 12px', borderRadius:6, display:'block', textAlign:'left', fontSize:12 }}>
            VITE_CLERK_PUBLISHABLE_KEY=pk_test_...<br/>
            VITE_API_URL=http://localhost:3001/api/v1
          </code><br/>
          Get your key from <a href="https://clerk.com" style={{ color:'#3b82f6' }}>clerk.com</a> → API Keys
        </div>
      </div>
    </div>
  );
} else {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ClerkProvider>
    </React.StrictMode>
  );
}
