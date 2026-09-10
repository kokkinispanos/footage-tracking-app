import { Wordmark } from './Brand';
import { GlassCard } from './GlassCard';

/** The frame shared by Log in, Register and Forgot password. */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-riseIn">
        <div className="flex justify-center mb-8">
          <Wordmark />
        </div>

        <GlassCard className="p-6 sm:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-ink-muted mt-2 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {children}
        </GlassCard>

        {footer && (
          <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>
        )}

        <p className="mt-8 text-center text-[11px] text-ink-faint leading-relaxed">
          Only Pro Placement players use this. Nobody sees your stuff except you and your coach.
        </p>
      </div>
    </div>
  );
}
