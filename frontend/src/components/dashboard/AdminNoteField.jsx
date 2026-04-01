import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { dbService } from '../../services/db';

export function AdminNoteField({ playerId, noteKey, initialValue = '' }) {
  const [note, setNote] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(!!initialValue);

  // Debounced save
  useEffect(() => {
    if (note === initialValue) return;
    
    setIsSaving(true);
    const timer = setTimeout(async () => {
      await dbService.updateAdminNotes(playerId, {
        perClip: {
          [noteKey]: note
        }
      });
      setIsSaving(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [note, initialValue, playerId, noteKey]);

  return (
    <div className="mt-4 pt-3 border-t border-brand-purple/20">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 text-sm font-medium transition-colors ${
          note ? 'text-brand-light' : 'text-white/40 hover:text-white/80'
        }`}
      >
        <MessageSquare className={`w-4 h-4 ${note && 'fill-brand-purple/20'}`} />
        {note ? 'Admin Note Active' : 'Add Admin Note'}
        {isSaving && <span className="ml-2 text-xs text-amber-400">Saving...</span>}
      </button>

      {isOpen && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Type admin notes for this specific clip/item..."
          className="w-full mt-3 bg-black/40 border border-brand-purple/30 rounded-lg p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-purple/60 focus:ring-1 focus:ring-brand-purple/60 resize-none min-h-[80px]"
        />
      )}
    </div>
  );
}
