import { useState, useId } from 'react';
import { ClipboardPaste, Check, AlertTriangle, Link2 } from 'lucide-react';
import { linkWarning, describeLink, normalizeUrl } from '../../utils/links';
import { cn } from '../../utils/cn';

/**
 * The box a player pastes a video link into. The single most used control in the app.
 *
 * Three things it does that a plain input did not:
 *
 *  1. **A Paste button.** On a phone, pasting means long-pressing a box, waiting for the
 *     menu, and hitting a small target. One tap instead.
 *  2. **It says what it recognised.** "YouTube" or "Google Drive" appearing under the box is
 *     the difference between a player trusting the app and a player pasting the same link
 *     four times because nothing acknowledged him.
 *  3. **It says the one thing that will go wrong.** Every link here can be pasted perfectly
 *     and still be unopenable by the editor, and that failure is silent for a week. A
 *     YouTube video set to Private is the common one, and it is not something the app can
 *     detect, so it has to be said out loud.
 *
 * YouTube and Google Drive are both first class on purpose. Three full games in 4K will not
 * fit in a free Drive, and a player who is told "Drive only" just sends nothing.
 */
export function LinkInput({
  label = 'Paste the link',
  value,
  onChange,
  placeholder = 'https://youtube.com/... or https://drive.google.com/...',
  hint,
  autoFocus = false,
  // A saved entry with no link is a row that counts for nothing and confuses everybody who
  // looks at it later, so the browser refuses the save rather than the app storing a blank.
  required = true,
  className,
}) {
  const id = useId();
  const [pasteError, setPasteError] = useState('');
  const warning = linkWarning(value);
  const found = warning ? null : describeLink(value);

  const paste = async () => {
    setPasteError('');
    try {
      const text = await navigator.clipboard.readText();
      if (!text?.trim()) { setPasteError('There is nothing copied yet.'); return; }
      onChange(normalizeUrl(text.trim()));
    } catch {
      // Firefox and some phone browsers refuse clipboard reads without a prompt.
      setPasteError('Your browser will not let us paste for you. Hold down on the box and pick Paste.');
    }
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-muted">{label}</label>

      <div className="flex gap-2">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          required={required}
          data-autofocus={autoFocus ? '' : undefined}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(normalizeUrl(e.target.value))}
          className={cn(
            'flex-1 min-w-0 bg-black/30 border rounded-xl px-4 py-3 text-ink',
            'placeholder:text-ink-faint focus:outline-none focus:ring-2 transition-all',
            warning
              ? 'border-error/70 focus:ring-error/25 focus:border-error'
              : 'border-white/10 focus:ring-brand/40 focus:border-brand/60',
          )}
        />
        <button
          type="button"
          onClick={paste}
          className="flex-none px-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-ink-muted
                     hover:bg-white/10 hover:text-ink transition-colors min-h-[48px]"
          aria-label="Paste from your clipboard"
          title="Paste"
        >
          <ClipboardPaste className="w-4 h-4" />
        </button>
      </div>

      {pasteError && <span className="text-xs text-warning leading-relaxed">{pasteError}</span>}

      {warning && (
        <span className="flex items-start gap-1.5 text-xs text-error leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 flex-none mt-px" /> {warning}
        </span>
      )}

      {found && (
        <span className="flex items-start gap-1.5 text-xs text-success leading-relaxed">
          <Check className="w-3.5 h-3.5 flex-none mt-px" />
          <span>
            <span className="font-medium">{found.label} link.</span> {found.note}
          </span>
        </span>
      )}

      {!warning && !found && (
        <span className="flex items-start gap-1.5 text-xs text-ink-faint leading-relaxed">
          <Link2 className="w-3.5 h-3.5 flex-none mt-px" />
          {hint || 'YouTube or Google Drive both work. Whichever you have space for.'}
        </span>
      )}
    </div>
  );
}
