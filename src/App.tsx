import { SignedIn, SignedOut, RedirectToSignIn, useOrganization } from '@clerk/clerk-react';
import { Dashboard } from './modules/dashboard/Dashboard';
import { OnboardingPage } from './modules/onboarding/OnboardingPage';

export default function App() {
  return (
    <>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function AuthenticatedApp() {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#07090f' }}>
        <div style={{ color: '#3b82f6', fontSize: 14 }}>Loading FieldOps...</div>
      </div>
    );
  }

  // If user hasn't created/joined an org yet, show onboarding
  if (!organization) {
    return <OnboardingPage />;
  }

  return <Dashboard />;
}
