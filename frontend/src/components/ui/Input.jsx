import React, { useId } from 'react';
import { cn } from "../../utils/cn";

export const Input = React.forwardRef(({
  label,
  error,
  hint,
  className,
  wrapperClassName,
  rightSlot,
  ...props
}, ref) => {
  const autoId = useId();
  const id = props.id || autoId;

  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-ink-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            "w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3",
            "text-ink placeholder:text-ink-faint",
            "focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60",
            "transition-all duration-200",
            rightSlot && "pr-11",
            error && "border-error/70 focus:ring-error/25 focus:border-error",
            className
          )}
          {...props}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{rightSlot}</div>
        )}
      </div>
      {error ? (
        <span id={`${id}-error`} role="alert" className="text-xs text-error">{error}</span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-xs text-ink-faint">{hint}</span>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
