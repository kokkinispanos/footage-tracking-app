import { cn } from "../../utils/cn";

export function GlassCard({ children, className, as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={cn(
        "bg-surface/80 border border-white/[0.07] rounded-2xl backdrop-blur-xl",
        "p-5 sm:p-6 text-ink shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
