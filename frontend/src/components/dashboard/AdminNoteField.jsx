import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Check, AlertTriangle } from 'lucide-react';
import { dbService } from '../../services/db';
import { cn } from '../../utils/cn';

/**
 * A note only the admin sees, attached to one clip, photo or folder.
 *
 * Two bugs fixed from the old version:
 *  1. Clearing a note never saved (it compared against a prop that never changed), so a
 *     note could be written but never removed. An empty box now deletes the note.
 *  2. Two notes edited within a second of each other lost one, because each save read the
 *     whole record, merged it in memory and wrote it all back. Each note is now written at
 *     its own field path, so two of them cannot collide.
 */
export function AdminNoteField({ docId, noteKey, initialValue = '' }) {
  const [note, setNote] = useState(initialValue);
  const [status, setStatus] = useState('idle');   // idle | saving | saved | error
  const [isOpen, setIsOpen] = useState(!!initialValue);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const change = useCallback((value) => {
    setNote(value);
    setStatus('saving');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await dbService.setClipNote(docId, noteKey, value);
        setStatus('saved');
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
      } catch {
        setStatus('error');
      }
    }, 800);
  }, [docId, noteKey]);

  return (
    <div className="mt-3.5 pt-3 border-t border-white/[0.07]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 text-[13px] font-medium transition-colors",
          note ? "text-brand-light" : "text-ink-faint hover:text-ink-muted"
        )}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        {note ? 'Note added' : 'Add a note'}
        {status === 'saving' && <span className="text-[11px] text-warning ml-1">saving…</span>}
        {status === 'saved' && <Check className="w-3.5 h-3.5 text-success ml-0.5" />}
        {status === 'error' && (
          <span className="inline-flex items-center gap-1 text-[11px] text-error ml-1">
            <AlertTriangle className="w-3 h-3" /> not saved
          </span>
        )}
      </button>

      {isOpen && (
        <textarea
          value={note}
          onChange={(e) => change(e.target.value)}
          placeholder="Only you see this. e.g. Too long, trim to 10 seconds. Or: use this as the opener."
          className="w-full mt-2.5 bg-black/40 border border-brand/25 rounded-xl p-3 text-[13px] text-ink
                     placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/30
                     focus:border-brand/50 resize-y min-h-[76px] transition-all"
        />
      )}
    </div>
  );
}
