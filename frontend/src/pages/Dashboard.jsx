import { useState } from 'react';
import { MailWarning, LifeBuoy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { calculateCompletion } from '../utils/completion';
import { AppHeader } from '../components/ui/AppHeader';
import { Splash } from '../components/ui/Splash';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { ProgressPanel } from '../components/dashboard/ProgressPanel';

import { Section1FullGames } from '../components/dashboard/Section1FullGames';
import { Section2TopClips } from '../components/dashboard/Section2TopClips';
import { Section3SkillClips } from '../components/dashboard/Section3SkillClips';
import { Section4Photos } from '../components/dashboard/Section4Photos';
import { Section5Drive } from '../components/dashboard/Section5Drive';

/** Shown when a signed-in player has no record yet — an old account waiting to be linked. */
function AwaitingRecord({ email, onLogout }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <GlassCard className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/25 flex items-center justify-center mx-auto mb-5">
          <LifeBuoy className="w-6 h-6 text-brand-light" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Your account is ready</h2>
        <p className="text-sm text-ink-muted leading-relaxed mb-6">
          We are connecting <span className="text-ink">{email}</span> to your existing footage.
          It usually takes a few minutes. Refresh this page, or come back shortly — nothing you
          sent us before has been lost.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => window.location.reload()}>Refresh</Button>
          <Button variant="ghost" onClick={onLogout}>Sign out</Button>
        </div>
      </GlassCard>
    </div>
  );
}

export function Dashboard() {
  const { user, logout, resendVerification } = useAuth();
  const { playerData, loading, notFound, saveStatus } = usePlayer();
  const [verificationSent, setVerificationSent] = useState(false);

  if (loading) return <Splash label="Opening your hub…" />;
  if (notFound || !playerData) {
    return <AwaitingRecord email={user?.email} onLogout={logout} />;
  }

  const stats = calculateCompletion(playerData);
  const firstName = (playerData.profile?.fullName || '').trim().split(' ')[0] || 'there';

  const sendVerification = async () => {
    try {
      await resendVerification();
      setVerificationSent(true);
    } catch { /* the banner simply stays */ }
  };

  return (
    <div className="min-h-dvh pb-20">
      <AppHeader
        subtitle="Player Hub"
        saveStatus={saveStatus}
        userName={playerData.profile?.fullName}
        onLogout={logout}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 sm:pt-9 space-y-6">
        {user && !user.emailVerified && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-warning/[0.08] border border-warning/25 rounded-2xl px-4 py-3.5 animate-fadeIn">
            <MailWarning className="w-5 h-5 text-warning flex-none" />
            <p className="text-sm text-ink-muted flex-1 leading-relaxed">
              {verificationSent
                ? 'Verification email sent. Check your inbox, and your spam folder.'
                : <>Confirm your email address so we can always reach you. We sent a link to <span className="text-ink">{user.email}</span>.</>}
            </p>
            {!verificationSent && (
              <Button variant="secondary" size="sm" onClick={sendVerification} className="flex-none">
                Send it again
              </Button>
            )}
          </div>
        )}

        <section className="animate-riseIn">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-1.5">
            Welcome back, {firstName}
          </h1>
          <p className="text-ink-muted mb-6 text-sm sm:text-base">
            Everything a club needs to see about you lives here.
          </p>
          <ProgressPanel stats={stats} />
        </section>

        <div className="space-y-5">
          <Section1FullGames />
          <Section2TopClips />
          <Section3SkillClips />
          <Section4Photos />
          <Section5Drive />
        </div>
      </main>
    </div>
  );
}
