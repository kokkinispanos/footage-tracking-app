import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

const LABELS = {
  fullGames: 'Full games',
  topThreeClips: 'Top 3 clips',
  skillClips: 'Skill clips',
  photos: 'Photos',
  driveFolder: 'Drive folder',
};

const BAR_TONE = {
  error: 'from-error/70 to-error',
  warning: 'from-warning/70 to-warning',
  success: 'from-success/70 to-success',
};

export function ProgressPanel({ stats }) {
  return (
    <div className="relative overflow-hidden bg-surface/80 border border-white/[0.07] rounded-2xl p-5 sm:p-6 shadow-card">
      <div className="absolute -top-24 -right-16 w-64 h-64 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-end justify-between mb-4 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-ink-faint font-medium mb-1.5">
              Your progress
            </div>
            <div className="text-3xl font-semibold tabular-nums">
              {stats.percent}<span className="text-ink-faint text-xl">%</span>
            </div>
          </div>
          <div className="text-sm text-ink-muted text-right">
            <span className="text-ink font-medium tabular-nums">{stats.done}</span> of {stats.total} pieces in place
          </div>
        </div>

        <div
          className="h-2.5 bg-black/40 rounded-full overflow-hidden mb-6"
          role="progressbar"
          aria-valuenow={stats.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall completion"
        >
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", BAR_TONE[stats.tone])}
            style={{ width: `${stats.percent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {stats.sections.map((s) => (
            <div
              key={s.key}
              className={cn(
                "rounded-xl border px-3 py-2.5 transition-colors",
                s.complete
                  ? "bg-success/[0.07] border-success/25"
                  : "bg-white/[0.03] border-white/[0.07]"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] text-ink-muted truncate">{LABELS[s.key]}</span>
                {s.complete && <Check className="w-3.5 h-3.5 text-success flex-none" />}
              </div>
              <div className="text-sm font-medium tabular-nums">
                <span className={s.complete ? 'text-success' : 'text-ink'}>{s.count}</span>
                <span className="text-ink-faint"> / {s.target}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
