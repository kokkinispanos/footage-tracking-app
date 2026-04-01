import React from 'react';
import { cn } from "../../utils/cn";

export const Input = React.forwardRef(({ 
  label, 
  error, 
  className,
  wrapperClassName,
  ...props 
}, ref) => {
  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5",
          "text-white placeholder:text-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand",
          "transition-all duration-200",
          error && "border-error focus:ring-error/20 focus:border-error",
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-error mt-0.5">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
