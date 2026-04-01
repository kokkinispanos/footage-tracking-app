import { cn } from "../../utils/cn";
import { CopyPlus } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({ 
  icon: Icon = CopyPlus, 
  title = "No items yet", 
  description = "Get started by adding your first item.",
  actionText = "Add Item",
  onAction,
  className
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      "border-2 border-dashed border-white/5 rounded-xl bg-white/[0.02]",
      className
    )}>
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-sm">{description}</p>
      
      {onAction && actionText && (
        <Button onClick={onAction} variant="outline" className="gap-2">
          <Icon className="w-4 h-4" />
          {actionText}
        </Button>
      )}
    </div>
  );
}
