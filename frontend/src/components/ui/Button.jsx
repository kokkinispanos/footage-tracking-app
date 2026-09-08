import { Loader2 } from 'lucide-react';
import { cn } from "../../utils/cn";

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading = false,
  ...props
}) {
  const base = "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium " +
    "transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-light " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background whitespace-nowrap";

  const variants = {
    primary: "bg-brand-sheen text-white shadow-glow hover:brightness-110",
    secondary: "bg-white/[0.06] text-ink border border-white/10 hover:bg-white/10",
    outline: "bg-transparent border border-brand/60 text-brand-light hover:bg-brand/10",
    danger: "bg-error/10 text-error border border-error/25 hover:bg-error/20",
    ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-white/[0.06]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[13px] min-h-[34px]",
    md: "px-4 py-2.5 text-sm min-h-[42px]",
    lg: "px-6 py-3.5 text-base min-h-[52px] w-full sm:w-auto",
  };

  const isBlocked = disabled || loading;

  return (
    <button
      disabled={isBlocked}
      aria-busy={loading || undefined}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        isBlocked
          ? "opacity-50 cursor-not-allowed"
          : "hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
