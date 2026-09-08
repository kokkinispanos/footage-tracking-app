import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, RefreshCw, ShieldAlert, Link2, Users, Clock } from 'lucide-react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { calculateCompletion, createdAtMs } from '../utils/completion';
import { describeActivity, lastActiveMs } from '../utils/activity';
import { AppHeader } from '../components/ui/AppHeader';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/Brand';
import { Splash } from '../components/ui/Splash';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../utils/cn';

const BAR_TONE = { error: 'bg-error', warning: 'bg-warning', success: 'bg-success' };

/**
 * Records created by the old app have no `authUid`, so nobody can sign in and reach them.
 * When the player signs up again with the same email, one click here joins the two —
 * and deletes the plaintext password the old app left behind.
 */
function LegacyPanel({ legacy, players, onLinked }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const stillHoldingPasswords = legacy.filter((r) => r.password !== undefined);
  if (legacy.length === 0) return null;

  const matchFor = (record) => {
    const email = (record.profile?.email || '').trim().toLowerCase();
    if (!email) return null;
    return players.find(
      (p) => p.authUid && (p.profile?.email || '').trim().toLowerCase() === email
    ) || null;
  };

  const carryAcross = async (record, match) => {
    setBusy(record.id);
    setError('');
    try {
      await dbService.mergeLegacyRecord(record, match.id);
      await onLinked();
    } catch (e) {
      setError(e?.message || 'Could not carry that record across.');
    } finally {
      setBusy(null);
    }
  };

  const purge = async (record) => {
    setBusy(record.id);
    setError('');
    try {
      await dbService.purgeLegacyPassword(record);
      await onLinked();
    } catch (e) {
      setError(e?.message || 'Could not clear that password.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <GlassCard className="border-warning/25 bg-warning/[0.04] space-y-4">
      <div className="flex items-start gap-3.5">
        <span className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/25 flex items-center justify-center flex-none">
          <ShieldAlert className="w-[18px] h-[18px] text-warning" />
        </span>
        <div>
          <h2 className="font-semibold text-ink">
            {legacy.length} record{legacy.length === 1 ? '' : 's'} from the old app
          </h2>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed max-w-2xl">
            These were made before sign-in was rebuilt, so nobody can open them yet. When the player
            registers again with the same email, press "Bring across" and his old footage lands on his new account.
            {stillHoldingPasswords.length > 0 && (
              <> <span className="text-warning">
                {stillHoldingPasswords.length} still hold{stillHoldingPasswords.length === 1 ? 's' : ''} a
                password saved by the old app — clear it now.
              </span></>
            )}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2">{error}</p>}

      <div className="space-y-2">
        {legacy.map((record) => {
          const match = matchFor(record);
          const hasPassword = record.password !== undefined;
          return (
            <div key={record.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-black/25 border border-white/[0.07] p-3.5">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-ink truncate">
                  {record.profile?.fullName || 'Unnamed record'}
                </div>
                <div className="text-xs text-ink-faint truncate mt-0.5">
                  {record.profile?.email || 'no email'} · {record.profile?.position || 'no position'}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-none">
                {hasPassword && (
                  <Button
                    variant="danger" size="sm"
                    loading={busy === record.id}
                    onClick={() => purge(record)}
                  >
                    Clear password
                  </Button>
                )}
                {match ? (
                  <Button
                    size="sm" className="gap-1.5"
                    loading={busy === record.id}
                    onClick={() => carryAcross(record, match)}
                  >
                    <Link2 className="w-3.5 h-3.5" /> Bring across
                  </Button>
                ) : (
                  <StatusPill tone="neutral">Waiting for him to register</StatusPill>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

export function AdminOverview() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [sortBy, setSortBy] = useState('least_complete');

  const load = useCallback(async () => {
    try {
      const all = await dbService.getAllPlayers();
      setPlayers(all);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load players.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => players.filter((p) => p.authUid), [players]);
  const legacy = useMemo(() => players.filter((p) => !p.authUid && !p.mergedInto), [players]);

  const rows = useMemo(() => {
    const enriched = active.map((p) => ({
      ...p,
      stats: calculateCompletion(p),
      activity: describeActivity(p),
    }));
    return enriched
      .filter((p) => !search || (p.profile?.fullName || '').toLowerCase().includes(search.toLowerCase())
                             || (p.profile?.email || '').toLowerCase().includes(search.toLowerCase()))
      .filter((p) => !positionFilter || p.profile?.position === positionFilter)
      .sort((a, b) => {
        if (sortBy === 'quietest') return lastActiveMs(a) - lastActiveMs(b);
        if (sortBy === 'newest') return createdAtMs(b) - createdAtMs(a);
        if (sortBy === 'az') return (a.profile?.fullName || '').localeCompare(b.profile?.fullName || '');
        if (sortBy === 'most_complete') return b.stats.percent - a.stats.percent;
        return a.stats.percent - b.stats.percent;   // least complete first: who needs chasing
      });
  }, [active, search, positionFilter, sortBy]);

  // "Quiet" is 14 days with no sign of life. Worth a message, not yet a problem.
  const quietCount = useMemo(
    () => active.filter((p) => describeActivity(p).quiet).length,
    [active]
  );

  const positions = useMemo(
    () => [...new Set(active.map((p) => p.profile?.position).filter(Boolean))].sort(),
    [active]
  );

  if (loading) return <Splash label="Loading players…" />;

  return (
    <div className="min-h-dvh pb-20">
      <AppHeader
        subtitle="Admin"
        userName={user?.displayName || user?.email}
        onLogout={logout}
        right={
          <Button variant="ghost" size="sm" onClick={load} className="gap-1.5" aria-label="Refresh">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 sm:pt-9 space-y-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold">Players</h1>
          <StatusPill tone="brand">{active.length} registered</StatusPill>
          {quietCount > 0 && (
            <StatusPill tone="warning">
              <Clock className="w-3 h-3" /> {quietCount} quiet for 2 weeks+
            </StatusPill>
          )}
        </div>

        {error && (
          <div className="text-sm text-error bg-error/10 border border-error/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <LegacyPanel legacy={legacy} players={players} onLinked={load} />

        <GlassCard className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              wrapperClassName="flex-1"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              rightSlot={<Search className="w-4 h-4 text-ink-faint mr-2" />}
            />
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="" className="bg-elevated">All positions</option>
              {positions.map((p) => <option key={p} value={p} className="bg-elevated">{p}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="least_complete" className="bg-elevated">Needs chasing first</option>
              <option value="quietest" className="bg-elevated">Quietest first</option>
              <option value="most_complete" className="bg-elevated">Most complete first</option>
              <option value="newest" className="bg-elevated">Newest first</option>
              <option value="az" className="bg-elevated">A to Z</option>
            </select>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title={active.length === 0 ? 'No players registered yet' : 'Nobody matches that'}
              description={active.length === 0
                ? 'A player appears here as soon as he creates his account.'
                : 'Try a different name or clear the filters.'}
            />
          ) : (
            <div className="space-y-2">
              {rows.map((player) => (
                <button
                  key={player.id}
                  onClick={() => navigate(`/admin/player/${player.id}`)}
                  className="w-full text-left group rounded-xl bg-black/20 border border-white/[0.07]
                             hover:border-brand/30 hover:bg-white/[0.03] transition-all p-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-xl bg-brand-sheen flex items-center justify-center text-sm font-semibold text-white flex-none">
                      {(player.profile?.fullName || '?').trim().charAt(0).toUpperCase()}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink truncate">
                          {player.profile?.fullName || 'Unnamed'}
                        </span>
                        {player.profile?.position && (
                          <StatusPill>{player.profile.position}</StatusPill>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-xs text-ink-faint truncate">{player.profile?.email}</span>
                        <span className={cn(
                          'text-xs flex-none',
                          player.activity.tone === 'error' && 'text-error',
                          player.activity.tone === 'warning' && 'text-warning',
                          player.activity.tone === 'success' && 'text-success',
                          player.activity.tone === 'neutral' && 'text-ink-faint',
                        )}>
                          · {player.activity.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 mt-2.5">
                        <div className="h-1.5 flex-1 max-w-[13rem] bg-black/40 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", BAR_TONE[player.stats.tone])}
                            style={{ width: `${player.stats.percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-ink-muted tabular-nums flex-none">
                          {player.stats.percent}% · {player.stats.done}/{player.stats.total}
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-ink-faint group-hover:text-brand-light group-hover:translate-x-0.5 transition-all flex-none" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </GlassCard>
      </main>
    </div>
  );
}
