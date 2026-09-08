import { cn } from "../../utils/cn";
import { CopyPlus } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({
  icon: Icon = CopyPlus,
  title = "Nothing here yet",
  description = "Add your first item to get started.",
  actionText,
  onAction,
  className
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center px-6 py-10 text-center",
      "border border-dashed border-white/10 rounded-2xl bg-white/[0.02]",
      className
    )}>
      <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-brand-light" />
      </div>
      <h3 className="text-base font-semibold text-ink mb-1.5">{title}</h3>
      <p className="text-sm text-ink-muted mb-5 max-w-sm leading-relaxed">{description}</p>

      {onAction && actionText && (
        <Button onClick={onAction} variant="outline" className="gap-2">
          <Icon className="w-4 h-4" />
          {actionText}
        </Button>
      )}
    </div>
  );
}
