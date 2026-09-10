import { useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * The building blocks of the hub questions.
 *
 * All of them save as he types. There is no Save button anywhere in the hub, because a Save
 * button is one more thing to forget and the app already tells him at the top of the screen
 * when it has saved.
 *
 * In read-only mode they render as plain text, not as a greyed-out box. A disabled input
 * that you cannot use is worse to read than a sentence.
 */

const boxStyles = "w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-ink " +
  "placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40 " +
  "focus:border-brand/60 transition-all";

function Wrapper({ id, label, hint, children, filled, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-ink-muted flex items-center gap-1.5">
          {label}
          {filled && <Check className="w-3.5 h-3.5 text-success" />}
        </label>
      )}
      {children}
      {hint && <span className="text-xs text-ink-faint leading-relaxed">{hint}</span>}
    </div>
  );
}

function ReadOnlyValue({ value, empty = 'Not filled in yet' }) {
  const text = Array.isArray(value) ? value.join(', ') : value;
  return (
    <p className={cn('text-sm py-2', text ? 'text-ink' : 'text-ink-faint italic')}>
      {text || empty}
    </p>
  );
}

/** A one-line answer. */
export function TextField({
  label, hint, value, onChange, readOnly, placeholder, type = 'text',
  unit, className, inputMode,
}) {
  const id = useId();
  if (readOnly) {
    return (
      <Wrapper id={id} label={label} className={className}>
        <ReadOnlyValue value={value ? `${value}${unit ? ` ${unit}` : ''}` : ''} />
      </Wrapper>
    );
  }
  return (
    <Wrapper id={id} label={label} hint={hint} filled={!!value} className={className}>
      <div className="relative">
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(boxStyles, unit && 'pr-16')}
        />
        {unit && (
          <span className="absolute inset-y-0 right-4 flex items-center text-[13px] text-ink-faint pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </Wrapper>
  );
}

/** A longer answer. */
export function TextArea({ label, hint, value, onChange, readOnly, placeholder, rows = 4, className }) {
  const id = useId();
  if (readOnly) {
    return (
      <Wrapper id={id} label={label} className={className}>
        <p className={cn('text-sm py-2 whitespace-pre-wrap leading-relaxed', value ? 'text-ink' : 'text-ink-faint italic')}>
          {value || 'Not filled in yet'}
        </p>
      </Wrapper>
    );
  }
  return (
    <Wrapper id={id} label={label} hint={hint} filled={!!value} className={className}>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(boxStyles, 'resize-y leading-relaxed')}
      />
    </Wrapper>
  );
}

/** Pick one from a list. */
export function SelectField({ label, hint, value, onChange, readOnly, options, placeholder = 'Pick one', className }) {
  const id = useId();
  const chosen = options.find((o) => (o.value ?? o) === value);
  if (readOnly) {
    return (
      <Wrapper id={id} label={label} className={className}>
        <ReadOnlyValue value={chosen ? (chosen.label ?? chosen) : ''} />
      </Wrapper>
    );
  }
  return (
    <Wrapper id={id} label={label} hint={hint} filled={!!value} className={className}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={boxStyles}
      >
        <option value="" className="bg-elevated">{placeholder}</option>
        {options.map((o) => {
          const v = o.value ?? o;
          return <option key={v} value={v} className="bg-elevated">{o.label ?? o}</option>;
        })}
      </select>
    </Wrapper>
  );
}

/**
 * Pick one, shown as buttons.
 * For short lists where seeing all the answers at once is quicker than opening a menu.
 */
export function ChoiceField({ label, hint, value, onChange, readOnly, options, className }) {
  const chosen = options.find((o) => o.value === value);
  if (readOnly) {
    return (
      <Wrapper label={label} className={className}>
        <ReadOnlyValue value={chosen?.label} />
      </Wrapper>
    );
  }
  return (
    <Wrapper label={label} hint={hint} filled={!!value} className={className}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(value === o.value ? '' : o.value)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm border transition-all min-h-[44px]',
              value === o.value
                ? 'bg-brand/15 border-brand/50 text-ink font-medium'
                : 'bg-black/25 border-white/10 text-ink-muted hover:border-white/25',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Wrapper>
  );
}

/** A yes/no tick that records WHEN it was ticked. */
export function ConsentField({ label, why, value, onChange, readOnly }) {
  const agreed = !!value?.agreed;
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        agreed ? 'bg-success/[0.06] border-success/25' : 'bg-black/20 border-white/[0.07]',
      )}
    >
      <label className={cn('flex items-start gap-3', !readOnly && 'cursor-pointer')}>
        <input
          type="checkbox"
          checked={agreed}
          disabled={readOnly}
          onChange={(e) =>
            onChange(e.target.checked
              ? { agreed: true, at: new Date().toISOString() }
              : { agreed: false, at: '' })}
          className="mt-0.5 w-5 h-5 flex-none rounded accent-brand cursor-pointer disabled:cursor-default"
        />
        <span className="min-w-0">
          <span className="block text-sm text-ink leading-relaxed">{label}</span>
          {why && <span className="block text-xs text-ink-faint mt-1 leading-relaxed">{why}</span>}
          {agreed && value?.at && (
            <span className="block text-xs text-success mt-1.5">
              You agreed on {new Date(value.at).toLocaleDateString()}
            </span>
          )}
        </span>
      </label>
    </div>
  );
}

/** Pick as many as apply, from a list, with room to add your own. */
export function TagField({ label, hint, value, onChange, readOnly, options, addLabel = 'Add another' }) {
  const chosen = Array.isArray(value) ? value : [];

  if (readOnly) {
    return (
      <Wrapper label={label}>
        <ReadOnlyValue value={chosen} empty="None picked yet" />
      </Wrapper>
    );
  }

  const toggle = (item) => {
    onChange(chosen.includes(item) ? chosen.filter((c) => c !== item) : [...chosen, item]);
  };

  const addOwn = () => {
    const typed = window.prompt('Type it and press OK');
    const clean = (typed || '').trim();
    if (clean && !chosen.includes(clean)) onChange([...chosen, clean]);
  };

  const extras = chosen.filter((c) => !options.includes(c));

  return (
    <Wrapper label={label} hint={hint} filled={chosen.length > 0}>
      <div className="flex flex-wrap gap-2">
        {[...options, ...extras].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => toggle(item)}
            className={cn(
              'px-3.5 py-2 rounded-full text-[13px] border transition-all min-h-[40px]',
              chosen.includes(item)
                ? 'bg-brand/15 border-brand/50 text-ink font-medium'
                : 'bg-black/25 border-white/10 text-ink-muted hover:border-white/25',
            )}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          onClick={addOwn}
          className="px-3.5 py-2 rounded-full text-[13px] border border-dashed border-white/20 text-ink-faint hover:text-ink hover:border-white/40 transition-all min-h-[40px]"
        >
          + {addLabel}
        </button>
      </div>
    </Wrapper>
  );
}
