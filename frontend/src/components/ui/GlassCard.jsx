import { cn } from "../../utils/cn";

export function GlassCard({ children, className, ...props }) {
  return (
    <div 
      className={cn(
        "bg-white/5 border border-white/10 rounded-xl backdrop-blur-md p-6 font-sans text-white shadow-xl", 
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
