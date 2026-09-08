import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, LogOut, Loader2, AlertTriangle, ChevronDown, Settings, CloudOff } from 'lucide-react';
import { Wordmark } from './Brand';
import { Button } from './Button';
import { useOnlineStatus, useDurableOffline } from '../../hooks/useOnlineStatus';
import { cn } from '../../utils/cn';

function SaveIndicator({ status, online, durable }) {
  if (!online) {
    // Two different truths. Claiming the first one when the second is true is how a player
    // closes his tab believing his work is safe when it is about to vanish.
    return durable ? (
      <span className="flex items-center gap-1.5 text-[11px] text-warning bg-warning/10 border border-warning/25 px-2.5 py-1 rounded-full">
        <CloudOff className="w-3 h-3" /> Offline — saved on this device
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-[11px] text-error bg-error/10 border border-error/25 px-2.5 py-1 rounded-full">
        <CloudOff className="w-3 h-3" /> Offline — keep this tab open
      </span>
    );
  }
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-brand-light bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full animate-fadeIn">
        <CheckCircle2 className="w-3 h-3" /> Saved
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-error bg-error/10 border border-error/20 px-2.5 py-1 rounded-full">
        <AlertTriangle className="w-3 h-3" /> Not saved
      </span>
    );
  }
  return null;
}

export function AppHeader({ subtitle, saveStatus, userName, onLogout, right, accountLink = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const online = useOnlineStatus();
  const durable = useDurableOffline();

  return (
    <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-white/[0.07]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Wordmark sub={subtitle} />
          <div className="hidden sm:block"><SaveIndicator status={saveStatus} online={online} durable={durable} /></div>
        </div>

        <div className="flex items-center gap-2">
          <div className="sm:hidden"><SaveIndicator status={saveStatus} online={online} durable={durable} /></div>
          {right}

          {userName && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                aria-expanded={menuOpen}
              >
                <span className="w-7 h-7 rounded-full bg-brand-sheen flex items-center justify-center text-[11px] font-semibold text-white flex-none">
                  {userName.trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:block text-sm text-ink-muted max-w-[10rem] truncate">
                  {userName}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-ink-faint transition-transform", menuOpen && "rotate-180")} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 z-20 bg-elevated border border-white/10 rounded-xl shadow-2xl p-1.5 animate-riseIn">
                    <div className="px-3 py-2 text-xs text-ink-faint border-b border-white/[0.07] mb-1 truncate">
                      {userName}
                    </div>
                    {accountLink && (
                      <Link
                        to="/account"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px]
                                   text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Your account
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onLogout}
                      className="w-full justify-start gap-2 text-ink-muted hover:text-error"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
