import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Check, AlertTriangle } from 'lucide-react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { calculateCompletion } from '../utils/completion';
import { AppHeader } from '../components/ui/AppHeader';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/Brand';
import { Splash } from '../components/ui/Splash';
import { ProgressPanel } from '../components/dashboard/ProgressPanel';

import { Section1FullGames } from '../components/dashboard/Section1FullGames';
import { Section2TopClips } from '../components/dashboard/Section2TopClips';
import { Section3SkillClips } from '../components/dashboard/Section3SkillClips';
import { Section4Photos } from '../components/dashboard/Section4Photos';
import { Section5Drive } from '../components/dashboard/Section5Drive';

export function AdminPlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [playerData, setPlayerData] = useState(null);
  const [adminNotes, setAdminNotes] = useState({ general: '', perClip: {} });
  const [loading, setLoading] = useState(true);
  const [generalNote, setGeneralNote] = useState('');
  const [noteStatus, setNoteStatus] = useState('idle');
  const timerRef = useRef(null);

  // The record and the notes are two separate documents on purpose: notes live in an
  // admin-only collection, because Firestore cannot hide a field from whoever reads the doc.
  useEffect(() => {
    let cancelled = false;
    Promise.all([dbService.getPlayerById(id), dbService.getAdminNotes(id)])
      .then(([player, notes]) => {
        if (cancelled) return;
        setPlayerData(player);
        setAdminNotes(notes);
        setGeneralNote(notes?.general || '');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Same debounced, field-path save as the per-clip notes.
  const changeNote = useCallback((value) => {
    setGeneralNote(value);
    setNoteStatus('saving');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await dbService.setGeneralNote(id, value);
        setNoteStatus('saved');
        setTimeout(() => setNoteStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
      } catch {
        setNoteStatus('error');
      }
    }, 800);
  }, [id]);

  const exportJson = useCallback(() => {
    if (!playerData) return;
    // Never hand the admin a file with a leftover password in it.
    const { password, ...safe } = playerData;
    const blob = new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(playerData.profile?.fullName || 'player').replace(/\s+/g, '_')}_hub.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [playerData]);

  if (loading) return <Splash label="Loading player…" />;

  if (!playerData) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <GlassCard className="text-center max-w-sm">
          <h2 className="text-lg font-semibold mb-2">Player not found</h2>
          <p className="text-sm text-ink-muted mb-6">That record does not exist any more.</p>
          <Button onClick={() => navigate('/admin')}>Back to players</Button>
        </GlassCard>
      </div>
    );
  }

  const stats = calculateCompletion(playerData);
  const shared = { adminMode: true, overrideData: playerData, adminDocId: id, adminNotes };

  return (
    <div className="min-h-dvh pb-20">
      <AppHeader
        subtitle="Admin"
        userName={user?.displayName || user?.email}
        onLogout={logout}
        right={
          <Button variant="ghost" size="sm" onClick={exportJson} className="gap-1.5">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All players
        </button>

        <section>
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-semibold">
              {playerData.profile?.fullName || 'Unnamed player'}
            </h1>
            {playerData.profile?.position && <StatusPill tone="brand">{playerData.profile.position}</StatusPill>}
            {!playerData.authUid && <StatusPill tone="warning">Old record, not linked</StatusPill>}
          </div>
          <p className="text-sm text-ink-muted mb-6">
            {playerData.profile?.email}
            {playerData.profile?.createdAt && ` · joined ${playerData.profile.createdAt.slice(0, 10)}`}
          </p>
          <ProgressPanel stats={stats} />
        </section>

        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Your notes on this player</h2>
            {noteStatus === 'saving' && <span className="text-[11px] text-warning">saving…</span>}
            {noteStatus === 'saved' && <Check className="w-4 h-4 text-success" />}
            {noteStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-error">
                <AlertTriangle className="w-3 h-3" /> not saved
              </span>
            )}
          </div>
          <textarea
            value={generalNote}
            onChange={(e) => changeNote(e.target.value)}
            placeholder="e.g. Needs 3 more defending clips. Chase on Friday."
            className="w-full bg-black/30 border border-white/10 rounded-xl p-3.5 text-sm text-ink placeholder:text-ink-faint
                       focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60 min-h-[100px] resize-y transition-all"
          />
          <p className="text-xs text-ink-faint">
            Admins only. These are kept in a separate place the player cannot read.
          </p>
        </GlassCard>

        <div className="space-y-5">
          <Section1FullGames {...shared} />
          <Section2TopClips {...shared} />
          <Section3SkillClips {...shared} />
          <Section4Photos {...shared} />
          <Section5Drive {...shared} />
        </div>
      </main>
    </div>
  );
}
