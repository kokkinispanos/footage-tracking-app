import { cn } from "../../utils/cn";

/** The mark: a chevron rising out of a rounded square, in the brand gradient. */
export function LogoMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-brand-sheen shadow-glow",
        "w-9 h-9 flex-none",
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <path
          d="M5 15.5 12 8l7 7.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Wordmark({ className, sub = "Player Hub" }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <div className="leading-none">
        <div className="font-semibold tracking-tight text-ink text-[15px]">Pro Placement</div>
        {sub && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-brand-light font-medium mt-1">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/** Small coloured state chip: done / in progress / not started. */
export function StatusPill({ tone = 'neutral', children, className }) {
  const tones = {
    success: "bg-success/10 text-success border-success/25",
    warning: "bg-warning/10 text-warning border-warning/25",
    error: "bg-error/10 text-error border-error/25",
    brand: "bg-brand/12 text-brand-light border-brand/25",
    neutral: "bg-white/[0.06] text-ink-muted border-white/10",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium",
      tones[tone],
      className
    )}>
      {children}
    </span>
  );
}
