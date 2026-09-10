import { useState, useEffect, useRef } from 'react';
import { MailWarning, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { readableAuthError } from '../../services/auth';
import { Button } from '../ui/Button';

const COOLDOWN_SECONDS = 60;

/**
 * "Please confirm your email address."
 *
 * This used to be a button that swallowed whatever went wrong: on any failure it did
 * nothing at all, changed no text, and left the player pressing it. Firebase rate-limits
 * these hard, so pressing it repeatedly is exactly what makes it keep failing, and the app
 * was telling him nothing while that happened.
 *
 * Now: it says what happened, it says WHERE to look (these land in Promotions or spam more
 * often than in the inbox), it refuses to let him hammer it into a rate limit, and it gives
 * him a way to re-check after he has clicked the link without hunting for a reload button.
 */
export function VerifyBanner({ email, onResend, onRecheck }) {
  const [state, setState] = useState({ status: 'idle', message: '' });
  const [cooldown, setCooldown] = useState(0);
  const [rechecking, setRechecking] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) { clearInterval(timerRef.current); return 0; }
        return n - 1;
      });
    }, 1000);
  };

  const send = async () => {
    setState({ status: 'sending', message: '' });
    try {
      await onResend();
      setState({ status: 'sent', message: '' });
      startCooldown();
    } catch (err) {
      setState({ status: 'error', message: readableAuthError(err) });
      // A rate limit is the most common failure here, and the cure is waiting.
      if (err?.code === 'auth/too-many-requests') startCooldown();
    }
  };

  const recheck = async () => {
    setRechecking(true);
    try { await onRecheck(); } catch { /* the banner just stays */ }
    setRechecking(false);
  };

  return (
    <div className="bg-warning/[0.08] border border-warning/25 rounded-2xl px-4 py-3.5 animate-fadeIn space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <MailWarning className="w-5 h-5 text-warning flex-none" />
        <p className="text-sm text-ink-muted flex-1 leading-relaxed">
          {state.status === 'sent'
            ? <>Sent again to <span className="text-ink">{email}</span>. It can take a minute.</>
            : <>Please click the link in the email we sent to <span className="text-ink">{email}</span>. It proves the address is yours.</>}
        </p>

        <div className="flex items-center gap-2 flex-none">
          <Button
            variant="ghost" size="sm" onClick={recheck} loading={rechecking} className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> I clicked it
          </Button>
          <Button
            variant="secondary" size="sm" onClick={send}
            loading={state.status === 'sending'}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Wait ${cooldown}s` : 'Send it again'}
          </Button>
        </div>
      </div>

      {state.status === 'sent' && (
        <p className="flex items-start gap-2 text-[13px] text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2.5">
          <Check className="w-4 h-4 flex-none mt-px" />
          <span>
            <strong className="text-ink">Look in your spam folder, and in the Promotions and
            Updates tabs.</strong> These emails land there more often than in your main inbox.
            It comes from <span className="text-ink">noreply@footage-tracker.firebaseapp.com</span>.
          </span>
        </p>
      )}

      {state.status === 'error' && (
        <p className="flex items-start gap-2 text-[13px] text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 flex-none mt-px" />
          <span>{state.message} If it keeps happening, tell Pro Placement.</span>
        </p>
      )}

      <p className="text-xs text-ink-faint leading-relaxed">
        You can carry on filling everything in without this. It only stops us joining you up
        with footage you sent us before.
      </p>
    </div>
  );
}
