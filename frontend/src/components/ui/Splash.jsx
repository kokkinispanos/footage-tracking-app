import { Loader2 } from 'lucide-react';
import { LogoMark } from './Brand';

/** Shown while Firebase decides whether anyone is signed in. */
export function Splash({ label = 'Loading…' }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5">
      <LogoMark className="w-12 h-12 animate-fadeIn" />
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}
