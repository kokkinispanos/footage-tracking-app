import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Full-screen sheet on a phone, centred dialog on a desktop.
 * Escape closes it, the background stops scrolling behind it, and focus starts inside.
 *
 * Rendered through a PORTAL onto document.body, and that is load-bearing rather than tidy.
 * These modals live inside GlassCard, which uses `backdrop-blur`, and an ancestor with a
 * backdrop-filter becomes the containing block for any `position: fixed` descendant. So the
 * dialog was being sized and placed against the CARD instead of the window: on a short
 * screen it hung off the bottom, taking the Save button with it, and the player filled the
 * whole form in and had nothing to press. A portal puts it back on the viewport where a
 * fixed overlay belongs.
 */
export function Modal({ isOpen, onClose, title, children, className }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector('input, textarea, select, button')?.focus?.();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn"
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={panelRef}
        className={cn(
          "w-full sm:max-w-lg relative flex flex-col z-10",
          "bg-elevated/95 border border-white/10 backdrop-blur-2xl",
          "rounded-t-3xl sm:rounded-2xl shadow-2xl",
          "max-h-[92dvh] sm:max-h-[85dvh] overflow-hidden animate-riseIn",
          className
        )}
      >
        {/* Grab handle, phones only. */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center flex-none">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Close"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-ink-muted hover:text-ink rounded-full hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {title && (
          <div className="px-5 sm:px-6 pt-4 sm:pt-6 pb-4 flex-none border-b border-white/[0.07]">
            <h2 className="text-lg sm:text-xl font-semibold text-ink pr-10">{title}</h2>
          </div>
        )}

        <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 safe-bottom">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
