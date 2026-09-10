import { Check, X, Rocket } from 'lucide-react';
import { readiness, eligibilityHint } from '../../utils/hubCompletion';
import { getIn } from '../../utils/nested';
import { GlassCard } from '../ui/GlassCard';
import { StatusPill } from '../ui/Brand';
import { cn } from '../../utils/cn';

/**
 * "Is he ready for the attack?" as a glance instead of an investigation.
 *
 * Every line is a column the Stage 3 outreach engine reads or a permission it needs. Nothing
 * is on this list because it would be nice to have. Before this existed the answer meant
 * opening the record, the Tally form and the sheet, and remembering what was in each.
 */
export function ReadinessPanel({ record }) {
  const state = readiness(record);
  const hint = eligibilityHint(record);
  const passport = getIn(record, ['identity', 'passportOne', 'country']);
  const second = getIn(record, ['identity', 'passportTwo', 'country']);
  const family = getIn(record, ['identity', 'euFamily', 'has']);

  return (
    <GlassCard className={cn(
      'space-y-4',
      state.ready ? 'border-success/30 bg-success/[0.04]' : 'border-white/[0.07]',
    )}>
      <div className="flex items-start gap-3.5">
        <span className={cn(
          'w-10 h-10 rounded-xl border flex items-center justify-center flex-none',
          state.ready ? 'bg-success/10 border-success/25' : 'bg-warning/10 border-warning/25',
        )}>
          <Rocket className={cn('w-[18px] h-[18px]', state.ready ? 'text-success' : 'text-warning')} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-semibold text-ink">Ready for Stage 3?</h2>
            <StatusPill tone={state.ready ? 'success' : 'warning'}>
              {state.done} of {state.total}
            </StatusPill>
          </div>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">
            {state.ready
              ? 'Everything the outreach engine needs is in. You can start his campaign.'
              : `${state.missing.length} thing${state.missing.length === 1 ? '' : 's'} still missing before club emails can go out.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {state.items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-[13px]">
            {item.ok
              ? <Check className="w-4 h-4 text-success flex-none" />
              : <X className="w-4 h-4 text-error flex-none" />}
            <span className={item.ok ? 'text-ink-muted' : 'text-ink'}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Eligibility is the answer that decides the whole club list, so it gets its own line. */}
      <div className="rounded-xl bg-black/25 border border-white/[0.07] p-3.5 text-[13px] space-y-1.5">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-ink-muted">
          <span>Passport: <span className="text-ink">{passport || 'not given'}</span></span>
          {second && <span>Second: <span className="text-ink">{second}</span></span>}
          <span>
            Family in the EU:{' '}
            <span className="text-ink">
              {family === 'yes' ? 'yes' : family === 'no' ? 'no' : family === 'notsure' ? 'not sure' : 'not asked'}
            </span>
          </span>
        </div>
        {hint && <p className="text-ink-faint leading-relaxed">{hint.text}</p>}
        <p className="text-ink-faint text-xs leading-relaxed">
          This is what he told us. Check the passport photo yourself before it decides a lane.
        </p>
      </div>
    </GlassCard>
  );
}
