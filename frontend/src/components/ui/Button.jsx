import { cn } from "../../utils/cn";

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  disabled, 
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 outline-none";
  
  const variants = {
    primary: "bg-brand hover:bg-brand-light text-white shadow-lg shadow-brand/20",
    secondary: "bg-surface hover:bg-white/10 text-white border border-white/10",
    outline: "bg-transparent border border-brand text-brand hover:bg-brand/10",
    danger: "bg-error/20 text-error hover:bg-error/30 border border-error/20",
    ghost: "bg-transparent text-gray-300 hover:text-white hover:bg-white/5"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      disabled={disabled}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        !disabled && "hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
