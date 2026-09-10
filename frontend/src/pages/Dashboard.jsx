import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MailWarning, LifeBuoy, Download, CloudOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useOnlineStatus, useDurableOffline } from '../hooks/useOnlineStatus';
import { calculateEverything } from '../utils/hubCompletion';
import { AppHeader } from '../components/ui/AppHeader';
import { Splash } from '../components/ui/Splash';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { ProgressPanel } from '../components/dashboard/ProgressPanel';
import { NextStep } from '../components/dashboard/NextStep';
import { SectionNav } from '../components/dashboard/SectionNav';
import { FOOTAGE_NAV, ABOUT_NAV } from '../components/dashboard/navItems';
import { cn } from '../utils/cn';

import { Section1FullGames } from '../components/dashboard/Section1FullGames';
import { Section2TopClips } from '../components/dashboard/Section2TopClips';
import { Section3SkillClips } from '../components/dashboard/Section3SkillClips';
import { Section4Photos } from '../components/dashboard/Section4Photos';
import { Section5Drive } from '../components/dashboard/Section5Drive';

import { SectionIdentity } from '../components/hub/SectionIdentity';
import { SectionPlayerCard } from '../components/hub/SectionPlayerCard';
import { SectionContact } from '../components/hub/SectionContact';
import { SectionDeliverables } from '../components/hub/SectionDeliverables';
import { SectionPlatforms } from '../components/hub/SectionPlatforms';

/** Shown when a signed-in player has no record yet: an old account waiting to be linked. */
function AwaitingRecord({ email, onLogout }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <GlassCard className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/25 flex items-center justify-center mx-auto mb-5">
          <LifeBuoy className="w-6 h-6 text-brand-light" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Your account is ready</h2>
        <p className="text-sm text-ink-muted leading-relaxed mb-6">
          We are joining <span className="text-ink">{email}</span> up with the footage you already
          sent us. It usually takes a few minutes. Hit refresh, or come back in a bit. Nothing
          you sent us has been lost.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => window.location.reload()}>Refresh</Button>
          <Button variant="ghost" onClick={onLogout}>Sign out</Button>
        </div>
      </GlassCard>
    </div>
  );
}

/**
 * Two tabs, not one long page.
 *
 * Ten sections in one scroll is a wall, and a wall is where a sixteen year old on a phone
 * gives up. The split is the one he already has in his head: the footage he sends us, and
 * everything else about him.
 */
function Tabs({ tab, onTab, stats }) {
  const buttons = [
    { key: 'footage', label: 'My footage', done: stats.footage.done, total: stats.footage.total },
    { key: 'about', label: 'About me', done: stats.hub.done, total: stats.hub.total },
  ];

  return (
    <div className="flex gap-2 p-1 rounded-2xl bg-black/25 border border-white/[0.07]">
      {buttons.map((b) => (
        <button
          key={b.key}
          onClick={() => onTab(b.key)}
          className={cn(
            'flex-1 rounded-xl px-4 py-3 text-sm transition-all min-h-[52px]',
            tab === b.key
              ? 'bg-brand-sheen text-white font-medium shadow-glow'
              : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]',
          )}
        >
          <span className="block">{b.label}</span>
          <span className={cn('block text-[11px] tabular-nums mt-0.5', tab === b.key ? 'text-white/75' : 'text-ink-faint')}>
            {b.done} of {b.total} done
          </span>
        </button>
      ))}
    </div>
  );
}

export function Dashboard() {
  const { user, logout, resendVerification } = useAuth();
  const { playerData, loading, notFound, saveStatus } = usePlayer();
  const online = useOnlineStatus();
  const durable = useDurableOffline();
  const [verificationSent, setVerificationSent] = useState(false);
  const [tab, setTab] = useState('footage');

  // `scroll-mt-24` on each anchor keeps the sticky header off the heading. The tab has to
  // change before the element exists, so the scroll waits a frame.
  const goTo = useCallback((anchor, wantedTab) => {
    if (wantedTab) setTab(wantedTab);
    if (!anchor) return;
    requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  if (loading) return <Splash label="Opening your hub…" />;
  if (notFound || !playerData) {
    return <AwaitingRecord email={user?.email} onLogout={logout} />;
  }

  const stats = calculateEverything(playerData);
  const firstName = (playerData.profile?.fullName || '').trim().split(' ')[0] || 'there';

  const sendVerification = async () => {
    try {
      await resendVerification();
      setVerificationSent(true);
    } catch { /* the banner simply stays */ }
  };

  return (
    <div className="min-h-dvh pb-28 sm:pb-20">
      <AppHeader
        subtitle="Player Hub"
        saveStatus={saveStatus}
        userName={playerData.profile?.fullName}
        onLogout={logout}
        accountLink
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 sm:pt-9 space-y-6">
        {!online && (
          <div className="flex items-start gap-3 bg-warning/[0.08] border border-warning/25 rounded-2xl px-4 py-3.5 animate-fadeIn">
            <CloudOff className={cn('w-5 h-5 flex-none mt-0.5', durable ? 'text-warning' : 'text-error')} />
            <p className="text-sm text-ink-muted leading-relaxed">
              {durable
                ? 'You have no internet right now. Keep going. Everything you add is saved on your phone and sent to us as soon as you get signal.'
                : 'You have no internet, and this browser will not let us save anything on your phone. You can keep typing, but do not close this page until you are back online or you will lose it.'}
            </p>
          </div>
        )}

        {user && !user.emailVerified && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-warning/[0.08] border border-warning/25 rounded-2xl px-4 py-3.5 animate-fadeIn">
            <MailWarning className="w-5 h-5 text-warning flex-none" />
            <p className="text-sm text-ink-muted flex-1 leading-relaxed">
              {verificationSent
                ? 'Sent. Go and check your email, and look in your spam folder too.'
                : <>Please click the link in the email we sent to <span className="text-ink">{user.email}</span>. It proves the address is yours.</>}
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
            Hi {firstName}
          </h1>
          <p className="text-ink-muted mb-6 text-sm sm:text-base">
            Everything about you goes in here. One place, so you never have to send it twice.
          </p>
          <ProgressPanel stats={stats} />

          <div className="mt-2.5 flex justify-end">
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Get a copy of everything you put in
            </Link>
          </div>
        </section>

        <NextStep playerData={playerData} onGo={goTo} />

        <Tabs tab={tab} onTab={setTab} stats={stats} />

        {tab === 'footage' ? (
          <div className="space-y-5">
            <div id="full-games" className="scroll-mt-24"><Section1FullGames /></div>
            <div id="top-clips" className="scroll-mt-24"><Section2TopClips /></div>
            <div id="skill-clips" className="scroll-mt-24"><Section3SkillClips /></div>
            <div id="photos" className="scroll-mt-24"><Section4Photos /></div>
            <div id="drive-folder" className="scroll-mt-24"><Section5Drive /></div>
          </div>
        ) : (
          <div className="space-y-5">
            <div id="identity" className="scroll-mt-24"><SectionIdentity /></div>
            <div id="player-card" className="scroll-mt-24"><SectionPlayerCard /></div>
            <div id="contact" className="scroll-mt-24"><SectionContact /></div>
            <div id="deliverables" className="scroll-mt-24"><SectionDeliverables /></div>
            <div id="platforms" className="scroll-mt-24"><SectionPlatforms /></div>
          </div>
        )}
      </main>

      <SectionNav
        items={tab === 'footage' ? FOOTAGE_NAV : ABOUT_NAV}
        stats={stats}
        onGo={goTo}
      />
    </div>
  );
}
