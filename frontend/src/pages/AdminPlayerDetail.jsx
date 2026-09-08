import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Check, AlertTriangle, FileText, Copy, Pencil, Clock } from 'lucide-react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { calculateCompletion } from '../utils/completion';
import { describeActivity, humanAge, fullDate, lastSavedMs, lastSeenMs } from '../utils/activity';
import { downloadLinkSheet, downloadRawJson, copyLinkSheet } from '../utils/export';
import { POSITIONS } from '../utils/catalog';
import { Input } from '../components/ui/Input';
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
  const [editing, setEditing] = useState(null);      // { fullName, position } while open
  const [editStatus, setEditStatus] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const copySheet = useCallback(async () => {
    if (!playerData) return;
    try {
      await copyLinkSheet(playerData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard refused; the downloads still work */ }
  }, [playerData]);

  /**
   * Fix a name or a position on the player's behalf.
   *
   * NOT the email: that is his Firebase Auth identity, and changing the copy on the record
   * would only make the two disagree. He changes it himself from his account page, which
   * sends a confirmation link to the new address.
   */
  const saveEdit = useCallback(async () => {
    if (!editing) return;
    if (!editing.fullName.trim()) { setEditStatus('A name cannot be empty.'); return; }
    setSavingEdit(true);
    setEditStatus('');
    try {
      await dbService.updateProfileFields(id, {
        fullName: editing.fullName.trim(),
        position: editing.position,
      });
      const fresh = await dbService.getPlayerById(id);
      setPlayerData(fresh);
      setEditing(null);
    } catch (e) {
      setEditStatus(e?.message || 'Could not save that.');
    } finally {
      setSavingEdit(false);
    }
  }, [editing, id]);

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
  const activity = describeActivity(playerData);
  const savedMs = lastSavedMs(playerData);
  const seenMs = lastSeenMs(playerData);
  const shared = { adminMode: true, overrideData: playerData, adminDocId: id, adminNotes };

  return (
    <div className="min-h-dvh pb-20">
      <AppHeader
        subtitle="Admin"
        userName={user?.displayName || user?.email}
        onLogout={logout}
        right={
          <Button variant="ghost" size="sm" onClick={() => downloadLinkSheet(playerData)} className="gap-1.5">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Link sheet</span>
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
            <StatusPill tone={activity.tone}>
              <Clock className="w-3 h-3" /> {activity.label}
            </StatusPill>
            <button
              onClick={() => setEditing({
                fullName: playerData.profile?.fullName || '',
                position: playerData.profile?.position || POSITIONS[0],
              })}
              className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Fix name or position
            </button>
          </div>

          <p className="text-sm text-ink-muted mb-4">
            {playerData.profile?.email}
            {playerData.profile?.createdAt && ` · joined ${playerData.profile.createdAt.slice(0, 10)}`}
          </p>

          {/* Two different facts: did he ADD anything, and did he even LOOK. */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-faint mb-6">
            <span>Last added something: <span className="text-ink-muted">{savedMs ? humanAge(savedMs) : 'never'}</span></span>
            <span>Last opened the hub: <span className="text-ink-muted">{seenMs ? humanAge(seenMs) : 'not since we started recording'}</span></span>
            {savedMs > 0 && <span className="hidden sm:inline">{fullDate(savedMs)}</span>}
          </div>

          {editing && (
            <GlassCard className="mb-6 space-y-4 border-brand/25">
              <h3 className="font-semibold text-ink text-sm">Fix this player's details</h3>
              <Input
                label="Full name"
                value={editing.fullName}
                onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-position" className="text-[13px] font-medium text-ink-muted">
                  Main position
                </label>
                <select
                  id="admin-position"
                  value={editing.position}
                  onChange={(e) => setEditing({ ...editing, position: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-ink
                             focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos} className="bg-elevated">{pos}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-ink-faint">
                His email is not editable here — it is his sign-in identity, and changing the copy
                on this record would only make the two disagree. He changes it from his own account
                page, which sends a confirmation link to the new address.
              </p>
              {editStatus && <p className="text-[13px] text-error">{editStatus}</p>}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                <Button variant="ghost" onClick={() => { setEditing(null); setEditStatus(''); }}>Cancel</Button>
                <Button onClick={saveEdit} loading={savingEdit}>Save</Button>
              </div>
            </GlassCard>
          )}

          <ProgressPanel stats={stats} />

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => downloadLinkSheet(playerData)} className="gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Link sheet for the editor
            </Button>
            <Button variant="ghost" size="sm" onClick={copySheet} className="gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy it'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => downloadRawJson(playerData)} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Raw data
            </Button>
          </div>
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
