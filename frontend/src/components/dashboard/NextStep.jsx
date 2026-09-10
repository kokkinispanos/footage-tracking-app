import { ArrowRight, PartyPopper, Target } from 'lucide-react';
import { nextThing } from '../../utils/hubCompletion';
import { weeksSinceStart } from '../../utils/completion';
import { Button } from '../ui/Button';

/**
 * One instruction, not a list.
 *
 * The audit's complaint was that nothing tells a player what to do: he sees a percentage
 * and ten half-full sections and closes the tab. This says the single next thing and takes
 * him to it, switching tab if it lives on the other one. No deadline, because the app does
 * not know his. "Week 3" is a fact; "you are late" would be a guess.
 */
export function NextStep({ playerData, onGo }) {
  const step = nextThing(playerData);
  const week = weeksSinceStart(playerData);

  if (step.done) {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-success/25 bg-success/[0.06] p-5 animate-fadeIn">
        <span className="w-10 h-10 rounded-xl bg-success/10 border border-success/25 flex items-center justify-center flex-none">
          <PartyPopper className="w-[18px] h-[18px] text-success" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">{step.title}</h2>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">{step.body}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand/25 bg-brand/[0.06] p-5 animate-fadeIn">
      <div className="flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center flex-none">
          <Target className="w-[18px] h-[18px] text-brand-light" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider text-brand-light font-semibold">
              Do this next
            </span>
            {week && <span className="text-[11px] text-ink-faint">· week {week} for you</span>}
          </div>
          <h2 className="font-semibold text-ink mt-1">{step.title}</h2>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">{step.body}</p>

          <Button
            size="sm"
            variant="secondary"
            className="mt-3.5 gap-1.5"
            onClick={() => onGo?.(step.anchor, step.tab)}
          >
            Take me there <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
