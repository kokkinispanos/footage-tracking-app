import { X } from "lucide-react";
import { cn } from "../../utils/cn";

export function Modal({ isOpen, onClose, title, children, className }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={cn("w-full max-w-lg relative flex flex-col z-10 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl max-h-[100%] overflow-hidden", className)}>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>
        {title && (
          <div className="px-6 pt-6 pb-4 flex-none border-b border-white/5">
            <h2 className="text-xl font-bold text-white pr-8">{title}</h2>
          </div>
        )}
        <div className="px-6 py-4 overflow-y-auto hide-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
