import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, User, AtSign, KeyRound, Download, Check, AlertTriangle, FileText, Copy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { authService, readableAuthError } from '../services/auth';
import { POSITIONS, isGoalkeeper } from '../utils/catalog';
import { downloadLinkSheet, downloadRawJson, copyLinkSheet } from '../utils/export';
import { AppHeader } from '../components/ui/AppHeader';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Splash } from '../components/ui/Splash';

const MIN_PASSWORD = 8;

/** A card with its own success / error line, so one failing block does not blank the page. */
function Panel({ icon: Icon, title, description, children, status }) {
  return (
    <GlassCard className="space-y-4">
      <div className="flex items-start gap-3.5">
        <span className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center flex-none">
          <Icon className="w-[18px] h-[18px] text-brand-light" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">{title}</h2>
          {description && (
            <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {children}

      {status?.error && (
        <p className="flex items-start gap-2 text-[13px] text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 flex-none mt-px" /> {status.error}
        </p>
      )}
      {status?.done && (
        <p className="flex items-start gap-2 text-[13px] text-success bg-success/10 border border-success/20 rounded-xl px-3 py-2.5">
          <Check className="w-4 h-4 flex-none mt-px" /> {status.done}
        </p>
      )}
    </GlassCard>
  );
}

export function Account() {
  const { user, logout } = useAuth();
  const { playerData, loading, saveProfile, saveStatus } = usePlayer();

  const [details, setDetails] = useState(null);       // { fullName, position } once loaded
  const [detailsStatus, setDetailsStatus] = useState({});
  const [savingDetails, setSavingDetails] = useState(false);

  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [emailStatus, setEmailStatus] = useState({});
  const [savingEmail, setSavingEmail] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const [copied, setCopied] = useState(false);

  if (loading) return <Splash label="Opening your account…" />;
  if (!playerData) return <Splash label="Opening your account…" />;

  // Seeded on first render from the record, then owned by the form.
  const form = details ?? {
    fullName: playerData.profile?.fullName || '',
    position: playerData.profile?.position || POSITIONS[0],
  };
  const setForm = (patch) => setDetails({ ...form, ...patch });

  const positionChanged = form.position !== (playerData.profile?.position || '');
  const keeperSwitch =
    positionChanged &&
    isGoalkeeper(form.position) !== isGoalkeeper(playerData.profile?.position || '');

  const saveDetails = async (e) => {
    e.preventDefault();
    setDetailsStatus({});
    if (!form.fullName.trim()) {
      setDetailsStatus({ error: 'Your name cannot be empty.' });
      return;
    }
    setSavingDetails(true);
    try {
      await saveProfile({ fullName: form.fullName.trim(), position: form.position });
      await authService.setDisplayName(form.fullName).catch(() => {});
      setDetailsStatus({ done: 'Saved.' });
      setDetails(null);
    } catch (err) {
      setDetailsStatus({ error: err?.message || 'Could not save that. Try again.' });
    } finally {
      setSavingDetails(false);
    }
  };

  const changeEmail = async (e) => {
    e.preventDefault();
    setEmailStatus({});
    const next = emailForm.newEmail.trim().toLowerCase();
    if (!next) return setEmailStatus({ error: 'Type the new email address.' });
    if (next === (user?.email || '').toLowerCase()) {
      return setEmailStatus({ error: 'That is already your email address.' });
    }
    if (!emailForm.password) return setEmailStatus({ error: 'Type your current password.' });

    setSavingEmail(true);
    try {
      await authService.changeEmail(emailForm.password, next);
      setEmailStatus({
        done: `Check ${next}. Your email changes as soon as you click the link we just sent there — until then you keep signing in with the old one.`,
      });
      setEmailForm({ newEmail: '', password: '' });
    } catch (err) {
      setEmailStatus({ error: readableAuthError(err) });
    } finally {
      setSavingEmail(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwStatus({});
    if (pwForm.next.length < MIN_PASSWORD) {
      return setPwStatus({ error: `Use at least ${MIN_PASSWORD} characters.` });
    }
    if (pwForm.next !== pwForm.confirm) {
      return setPwStatus({ error: 'The two new passwords do not match.' });
    }
    setSavingPw(true);
    try {
      await authService.changePassword(pwForm.current, pwForm.next);
      setPwStatus({ done: 'Password changed. It works from your next sign-in.' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwStatus({ error: readableAuthError(err) });
    } finally {
      setSavingPw(false);
    }
  };

  const copy = async () => {
    try {
      await copyLinkSheet(playerData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard refused: the download buttons still work */ }
  };

  return (
    <div className="min-h-dvh pb-20">
      <AppHeader
        subtitle="Your account"
        saveStatus={saveStatus}
        userName={playerData.profile?.fullName}
        onLogout={logout}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-7 sm:pt-9 space-y-5">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to your hub
        </Link>

        <h1 className="text-2xl sm:text-3xl font-semibold">Your account</h1>

        {/* ----------------------------------------------------------- details */}
        <Panel
          icon={User}
          title="Your details"
          description="Your name as it should appear to a club, and the position you want to be seen in."
          status={detailsStatus}
        >
          <form onSubmit={saveDetails} className="space-y-4">
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(e) => setForm({ fullName: e.target.value })}
              hint="As it appears on your passport."
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="position" className="text-[13px] font-medium text-ink-muted">
                Main position
              </label>
              <select
                id="position"
                value={form.position}
                onChange={(e) => setForm({ position: e.target.value })}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-ink
                           focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60"
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p} className="bg-elevated">{p}</option>
                ))}
              </select>
              {keeperSwitch ? (
                <span className="text-xs text-warning">
                  Goalkeepers and outfield players are asked for different skill clips. Nothing you
                  have already added is deleted — clips from the other set stay saved and appear in
                  your export.
                </span>
              ) : (
                <span className="text-xs text-ink-faint">
                  This decides which skill categories you are asked for.
                </span>
              )}
            </div>

            <Button type="submit" loading={savingDetails} disabled={!details}>
              Save changes
            </Button>
          </form>
        </Panel>

        {/* ------------------------------------------------------------- email */}
        <Panel
          icon={AtSign}
          title="Sign-in email"
          description={`You sign in with ${user?.email}. Everything we send you goes there.`}
          status={emailStatus}
        >
          <form onSubmit={changeEmail} className="space-y-4">
            <Input
              label="New email address"
              type="email"
              autoComplete="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
              placeholder="you@example.com"
            />
            <Input
              label="Your current password"
              type="password"
              autoComplete="current-password"
              value={emailForm.password}
              onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
              hint="We ask so that nobody who finds your screen unlocked can move your account."
            />
            <Button type="submit" variant="secondary" loading={savingEmail}>
              Send the confirmation link
            </Button>
          </form>
        </Panel>

        {/* ---------------------------------------------------------- password */}
        <Panel
          icon={KeyRound}
          title="Password"
          description="Use one you do not use anywhere else."
          status={pwStatus}
        >
          <form onSubmit={changePassword} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              hint={`At least ${MIN_PASSWORD} characters.`}
            />
            <Input
              label="New password again"
              type="password"
              autoComplete="new-password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            />
            <Button type="submit" variant="secondary" loading={savingPw}>
              Change password
            </Button>
          </form>
        </Panel>

        {/* -------------------------------------------------------------- data */}
        <Panel
          icon={Download}
          title="Take your data with you"
          description="Everything you have put in here is yours. Download it whenever you like — you do not need to ask us."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button variant="secondary" onClick={() => downloadLinkSheet(playerData)} className="gap-2">
              <FileText className="w-4 h-4" /> Download as a list
            </Button>
            <Button variant="secondary" onClick={() => downloadRawJson(playerData)} className="gap-2">
              <Download className="w-4 h-4" /> Download raw data
            </Button>
            <Button variant="ghost" onClick={copy} className="gap-2 sm:col-span-2">
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to your clipboard' : 'Copy the list to send to someone'}
            </Button>
          </div>
          <p className="text-xs text-ink-faint leading-relaxed">
            The list is the readable one — every link grouped by section, with what is still
            missing at the bottom. The raw file is everything exactly as it is stored.
          </p>
        </Panel>
      </main>
    </div>
  );
}
