import { cn } from '../../utils/cn';
import { GlassCard } from '../ui/GlassCard';

/** The heading every dashboard section shares: icon, title, one line of guidance, a counter. */
export function SectionShell({
  icon: Icon,
  index,
  title,
  description,
  count,
  target,
  action,
  children,
  className,
}) {
  const complete = typeof target === 'number' && count >= target;

  return (
    <GlassCard className={cn("space-y-5 animate-fadeIn", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex gap-3.5 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-none">
            <Icon className="w-[18px] h-[18px] text-brand-light" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold leading-snug">
              <span className="text-ink-faint font-normal mr-1.5">{index}.</span>
              {title}
            </h2>
            <p className="text-[13px] text-ink-muted mt-1 leading-relaxed max-w-2xl">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-none sm:pl-4">
          {typeof target === 'number' && (
            <div className="text-[13px] tabular-nums">
              <span className={complete ? 'text-success font-medium' : 'text-warning font-medium'}>
                {count}
              </span>
              <span className="text-ink-faint"> / {target}</span>
            </div>
          )}
          {action}
        </div>
      </div>

      {children}
    </GlassCard>
  );
}
